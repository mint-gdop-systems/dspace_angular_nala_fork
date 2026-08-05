import { Component } from '@angular/core';

import { AdminWorkflowPageWrapperComponent as BaseComponent } from '../../../../../app/admin/admin-workflow-page/admin-workflow-page-wrapper.component';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ThemedConfigurationSearchPageComponent } from '../../../../../app/search-page/themed-configuration-search-page.component';

@Component({
  selector: 'ds-themed-admin-workflow-page-wrapper',
  // styleUrls: ['./admin-workflow-page-wrapper.component.scss'],
  styleUrls: ['../../../../../app/admin/admin-workflow-page/admin-workflow-page-wrapper.component.scss'],
  // templateUrl: './admin-workflow-page-wrapper.component.html',
  templateUrl: '../../../../../app/admin/admin-workflow-page/admin-workflow-page-wrapper.component.html',
  imports: [
    NgbNavModule,
    TranslateModule,
    ThemedConfigurationSearchPageComponent,
  ],
})
export class AdminWorkflowPageWrapperComponent extends BaseComponent {
}