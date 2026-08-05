import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { NotificationsService } from '../../../shared/notifications/notifications.service';

import { BulkApproveService, WorkflowItemWithActions } from './bulk-approve.service';

@Component({
  selector: 'ds-bulk-approve',
  templateUrl: './bulk-approve.component.html',
  styleUrls: ['./bulk-approve.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    TranslateModule,
  ],
})
export class BulkApproveComponent implements OnInit {

  /**
   * List of items available for final approval
   */
  items$: Observable<WorkflowItemWithActions[]>;

  /**
   * Set of selected item IDs
   */
  selectedIds: Set<string> = new Set();

  /**
   * Whether all items are selected
   */
  allSelected = false;

  /**
   * Whether items are currently being loaded
   */
  loading = true;

  /**
   * Whether an approval operation is in progress
   */
  approving = false;

  /**
   * Number of items currently being approved
   */
  approvalProgress = 0;

  /**
   * Total number of items to approve
   */
  approvalTotal = 0;

  constructor(
    private bulkApproveService: BulkApproveService,
    private notificationsService: NotificationsService,
  ) {
  }

  ngOnInit(): void {
    this.loadItems();
  }

  /**
   * Load items that are in the finaleditstep and available for approval
   */
  loadItems(): void {
    this.loading = true;
    this.selectedIds = new Set();
    this.allSelected = false;

    this.items$ = this.bulkApproveService.getItemsForFinalApproval().pipe(
      map((items) => {
        this.loading = false;
        return items;
      }),
      catchError(() => {
        this.loading = false;
        return of([]);
      }),
    );
  }

  /**
   * Toggle selection of a single item
   */
  toggleItem(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.updateAllSelected();
  }

  /**
   * Toggle select all / deselect all
   */
  toggleSelectAll(items: WorkflowItemWithActions[]): void {
    if (this.allSelected) {
      this.selectedIds.clear();
      this.allSelected = false;
    } else {
      items.forEach((item) => this.selectedIds.add(item.id));
      this.allSelected = true;
    }
  }

  /**
   * Update the "all selected" state based on current selection
   */
  private updateAllSelected(): void {
    // This is called from toggleItem - actual allSelected is checked in template
  }

  /**
   * Check if all items are selected
   */
  isAllSelected(items: WorkflowItemWithActions[]): boolean {
    if (items.length === 0) {
      return false;
    }
    return items.every((item) => this.selectedIds.has(item.id));
  }

  /**
   * Approve all selected items one by one
   */
  approveSelected(items: WorkflowItemWithActions[]): void {
    const selectedItems = items.filter((item) => this.selectedIds.has(item.id));

    if (selectedItems.length === 0) {
      this.notificationsService.warning(
        'admin.workflow.bulk-approve.no-selection.title',
        'admin.workflow.bulk-approve.no-selection.content',
      );
      return;
    }

    this.approving = true;
    this.approvalProgress = 0;
    this.approvalTotal = selectedItems.length;

    this.approveNext(selectedItems, 0);
  }

  /**
   * Recursively approve items one by one
   */
  private approveNext(items: WorkflowItemWithActions[], index: number): void {
    if (index >= items.length) {
      // All done
      this.approving = false;
      this.notificationsService.success(
        'admin.workflow.bulk-approve.complete.title',
        'admin.workflow.bulk-approve.complete.content',
      );
      this.loadItems();
      return;
    }

    const item = items[index];
    this.bulkApproveService.approveItem(item.id).pipe(
      finalize(() => {
        this.approvalProgress = index + 1;
      }),
    ).subscribe({
      next: (success) => {
        if (success) {
          this.notificationsService.success(
            'admin.workflow.bulk-approve.approve-success.title',
            { title: item.title },
          );
        } else {
          this.notificationsService.error(
            'admin.workflow.bulk-approve.approve-error.title',
            { title: item.title },
          );
        }
        this.approveNext(items, index + 1);
      },
      error: () => {
        this.notificationsService.error(
          'admin.workflow.bulk-approve.approve-error.title',
          { title: item.title },
        );
        this.approveNext(items, index + 1);
      },
    });
  }
}