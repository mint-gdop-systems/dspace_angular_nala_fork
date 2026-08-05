import { AsyncPipe } from '@angular/common';
import { ClaimedTaskDataService } from '../../../core/tasks/claimed-task-data.service';
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslatePipe } from '@ngx-translate/core';
import {
  BehaviorSubject,
  Observable,
  of,
} from 'rxjs';
import {
  filter,
  finalize,
  map,
  switchMap,
  take,
} from 'rxjs/operators';

import { SubmissionRestService } from '../../../core/submission/submission-rest.service';
import { SubmissionScopeType } from '../../../core/submission/submission-scope-type';
import { BtnDisabledDirective } from '../../../shared/btn-disabled.directive';
import { isNotEmpty } from '../../../shared/empty.util';
import { BrowserOnlyPipe } from '../../../shared/utils/browser-only.pipe';
import { SubmissionService } from '../../submission.service';
import { NotificationsService } from '../../../shared/notifications/notifications.service';
import { HttpClient } from '@angular/common/http';
/**
 * This component represents submission form footer bar.
 */
@Component({
  selector: 'ds-base-submission-form-footer',
  styleUrls: ['./submission-form-footer.component.scss'],
  templateUrl: './submission-form-footer.component.html',
  imports: [
    AsyncPipe,
    BrowserOnlyPipe,
    BtnDisabledDirective,
    TranslatePipe,
  ],
})
export class SubmissionFormFooterComponent implements OnChanges {

  /**
   * The submission id
   * @type {string}
   */
  @Input() submissionId: string;

  /**
   * A boolean representing if a submission deposit operation is pending
   * @type {Observable<boolean>}
   */
  public processingDepositStatus: Observable<boolean>;

  /**
   * A boolean representing if a submission save operation is pending
   * @type {Observable<boolean>}
   */
  public processingSaveStatus: Observable<boolean>;

  /**
   * A boolean representing if showing deposit and discard buttons
   * @type {Observable<boolean>}
   */
  public showDepositAndDiscard: Observable<boolean>;

  /**
   * A boolean representing if submission form is valid or not
   * @type {Observable<boolean>}
   */
  public submissionIsInvalid: Observable<boolean> = of(true);

  /**
   * A boolean representing if submission form has unsaved modifications
   * @type {Observable<boolean>}
   */
  public hasUnsavedModification: Observable<boolean>;

  /**
   * A boolean representing if showing approve button for workflow items
   * @type {Observable<boolean>}
   */
  public showApproveButton: Observable<boolean>;
  private processingApproveStatusSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public processingApproveStatus: Observable<boolean> = this.processingApproveStatusSubject.asObservable();

  /**
   * Initialize instance variables
   *
   * @param {NgbModal} modalService
   * @param {SubmissionRestService} restService
   * @param {SubmissionService} submissionService
   * @param {ActivatedRoute} route
   * @param {NotificationsService} notificationsService
   * @param {HttpClient} http
   */
constructor(private modalService: NgbModal,
            private restService: SubmissionRestService,
            private submissionService: SubmissionService,
            private route: ActivatedRoute,
            private notificationsService: NotificationsService,
            private http: HttpClient,
            private claimedTaskService: ClaimedTaskDataService) {
}

  /**
   * Initialize all instance variables
   */
  ngOnChanges(changes: SimpleChanges) {
    if (isNotEmpty(this.submissionId)) {
      this.submissionIsInvalid = this.submissionService.getSubmissionStatus(this.submissionId).pipe(
        map((isValid: boolean) => isValid === false),
      );

      this.processingSaveStatus = this.submissionService.getSubmissionSaveProcessingStatus(this.submissionId);
      this.processingDepositStatus = this.submissionService.getSubmissionDepositProcessingStatus(this.submissionId);
      const submissionScope = this.submissionService.getSubmissionScope();
      this.showDepositAndDiscard = of(submissionScope === SubmissionScopeType.WorkspaceItem);
      this.showApproveButton = of(submissionScope === SubmissionScopeType.WorkflowItem);
      this.hasUnsavedModification = this.submissionService.hasUnsavedModification();
    }
  }

  /**
   * Dispatch a submission save action
   */
  save(event) {
    this.submissionService.dispatchSave(this.submissionId, true);
  }

  /**
   * Dispatch a submission save for later action
   */
  saveLater(event) {
    this.submissionService.dispatchSaveForLater(this.submissionId);
  }

  /**
   * Dispatch a submission deposit action
   */
  public deposit(event) {
    this.submissionService.dispatchDeposit(this.submissionId);
  }

  /**
   * Dispatch a submission approve action for workflow items
   */
public approve(event) {
  // First save
  this.submissionService.dispatchSave(this.submissionId, true);
  
  this.submissionService.getSubmissionSaveProcessingStatus(this.submissionId).pipe(
    filter((isPending) => !isPending),
    take(1),
    switchMap(() => {
      return this.restService.getDataById('workflowitems', this.submissionId);
    }),
    switchMap((workflowItem: any) => {
      const firstItem = workflowItem[0];
      const itemUuid = firstItem?.item?.uuid || firstItem?._embedded?.item?.uuid || firstItem?.uuid;
      
      if (!itemUuid) {
        throw new Error('No item found');
      }
      
      // Use ClaimedTaskDataService to find by item UUID
      return this.claimedTaskService.findByItem(itemUuid);
    }),
    map((response: any) => {
      // Extract the claimed task ID from the response
      const claimedTaskId = response.payload?.id || response.id;
      return claimedTaskId;
    }),
    take(1)
  ).subscribe({
    next: (claimedTaskId: string) => {
      if (!claimedTaskId) {
        this.notificationsService.error('Error', 'No claimed task found');
        return;
      }
      
      this.processingApproveStatusSubject.next(true);
      this.submissionService.dispatchApprove(claimedTaskId).pipe(
        finalize(() => {
          this.processingApproveStatusSubject.next(false);
        }),
      ).subscribe({
        next: (result) => {
          if (result) {
            this.submissionService.redirectToMyDSpace();
          }
        },
        error: (err) => console.error('Approve error:', err)
      });
    },
    error: (err) => {
      console.error('Error in approve flow:', err);
      this.notificationsService.error('Error', 'Could not approve');
      this.processingApproveStatusSubject.next(false);
    }
  });
}
  /**
   * Dispatch a submission discard action
   */
  public confirmDiscard(content) {
    this.modalService.open(content).result.then(
      (result) => {
        if (result === 'ok') {
          this.submissionService.dispatchDiscard(this.submissionId);
        }
      },
    );
  }
}
