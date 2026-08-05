import { Component } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { Context } from '../../core/shared/context.model';
import { ThemedConfigurationSearchPageComponent } from '../../search-page/themed-configuration-search-page.component';
import { BulkApproveComponent } from './bulk-approve/bulk-approve.component';

@Component({
  selector: 'ds-base-admin-workflow-page-wrapper',
  templateUrl: './admin-workflow-page-wrapper.component.html',
  styleUrls: ['./admin-workflow-page-wrapper.component.scss'],
  standalone: true,
  imports: [
    NgbNavModule,
    TranslateModule,
    ThemedConfigurationSearchPageComponent,
    BulkApproveComponent,
  ],
})
export class AdminWorkflowPageWrapperComponent {
  /**
   * The context of this page for the workflow tab
   */
  context: Context = Context.AdminWorkflowSearch;

  /**
   * Active tab ID
   */
  activeTab: 'workflow' | 'bulk-approve' = 'workflow';
}