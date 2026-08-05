import { AsyncPipe, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  map,
  take,
} from 'rxjs/operators';

import { BulkApproveComponent } from '../admin/admin-workflow-page/bulk-approve/bulk-approve.component';

import { MyDSpaceResponseParsingService } from '../core/data/mydspace-response-parsing.service';
import { MyDSpaceRequest } from '../core/data/request.models';
import { RoleType } from '../core/roles/role-types';
import { Context } from '../core/shared/context.model';
import { SearchService } from '../core/shared/search/search.service';
import { ViewMode } from '../core/shared/view-mode.model';
import { SuggestionsNotificationComponent } from '../notifications/suggestions/notification/suggestions-notification.component';
import { RoleDirective } from '../shared/roles/role.directive';
import { SearchConfigurationOption } from '../shared/search/search-switch-configuration/search-configuration-option.model';
import { ThemedSearchComponent } from '../shared/search/themed-search.component';
import {
  MyDSpaceConfigurationService,
  SEARCH_CONFIG_SERVICE,
  MyDSpaceConfigurationToContextMap,
} from './my-dspace-configuration.service';
import { MyDSpaceConfigurationValueType } from './my-dspace-configuration-value-type';
import { MyDSpaceNewSubmissionComponent } from './my-dspace-new-submission/my-dspace-new-submission.component';
import { MyDspaceQaEventsNotificationsComponent } from './my-dspace-qa-events-notifications/my-dspace-qa-events-notifications.component';

export const MYDSPACE_ROUTE = '/mydspace';

/**
 * This component represents the whole mydspace page
 */
@Component({
  selector: 'ds-base-my-dspace-page',
  styleUrls: ['./my-dspace-page.component.scss'],
  templateUrl: './my-dspace-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: SEARCH_CONFIG_SERVICE,
      useClass: MyDSpaceConfigurationService,
    },
  ],
  imports: [
    AsyncPipe,
    BulkApproveComponent,
    MyDSpaceNewSubmissionComponent,
    MyDspaceQaEventsNotificationsComponent,
    RoleDirective,
    SuggestionsNotificationComponent,
    ThemedSearchComponent,
  ],
})
export class MyDSpacePageComponent implements OnInit {

  /**
   * The list of available configuration options
   */
  configurationList$: Observable<SearchConfigurationOption[]>;

  /**
   * The current context to use
   */
  context: Context;

  /**
   * The current configuration to use
   */
  configuration: string;

  /**
   * Variable for enumeration RoleType
   */
  roleTypeEnum = RoleType;

  /**
   * List of available view mode
   */
  viewModeList = [ViewMode.ListElement, ViewMode.DetailedListElement];

  constructor(private service: SearchService,
              @Inject(SEARCH_CONFIG_SERVICE) public searchConfigService: MyDSpaceConfigurationService) {
    this.service.setServiceOptions(MyDSpaceResponseParsingService, MyDSpaceRequest);
  }

  /**
   * Initialize available configuration list
   *
   * Subscribe to configuration changes from the search service to reactively
   * update the current configuration and context, which allows switching between
   * the normal search view and the bulk approve view.
   */
  ngOnInit(): void {
    this.configurationList$ = this.searchConfigService.getAvailableConfigurationOptions();

    // Reactively track configuration changes from the URL/selector
    this.searchConfigService.getCurrentConfiguration('workflow').pipe(
      take(1),
      map((currentConfig: string) => {
        this.configuration = currentConfig;
        const mappedContext = MyDSpaceConfigurationToContextMap.get(currentConfig as MyDSpaceConfigurationValueType);
        this.context = mappedContext || Context.AdminWorkflowSearch;
      }),
    ).subscribe();
  }

}