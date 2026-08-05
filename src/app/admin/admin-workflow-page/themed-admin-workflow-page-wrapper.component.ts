import { Component } from '@angular/core';

import { ThemedComponent } from '../../shared/theme-support/themed.component';
import { AdminWorkflowPageWrapperComponent } from './admin-workflow-page-wrapper.component';

/**
 * Themed wrapper for {@link AdminWorkflowPageWrapperComponent}
 */
@Component({
  selector: 'ds-admin-workflow-page-wrapper',
  templateUrl: '../../shared/theme-support/themed.component.html',
})
export class ThemedAdminWorkflowPageWrapperComponent extends ThemedComponent<AdminWorkflowPageWrapperComponent> {

  protected getComponentName(): string {
    return 'AdminWorkflowPageWrapperComponent';
  }

  protected importThemedComponent(themeName: string): Promise<any> {
    return import(`../../../themes/${themeName}/app/admin/admin-workflow-page/admin-workflow-page-wrapper.component`);
  }

  protected importUnthemedComponent(): Promise<any> {
    return import('./admin-workflow-page-wrapper.component');
  }

}