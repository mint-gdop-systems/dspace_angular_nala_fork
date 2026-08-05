import { Route } from '@angular/router';

import { i18nBreadcrumbResolver } from '../../../../core/breadcrumbs/i18n-breadcrumb.resolver';
import { CatalogueReportComponent } from './catalogue-report.component';
import { authenticatedGuard } from '../../../../core/auth/authenticated.guard';

export const ROUTES: Route[] = [
  {
    path: 'catalogue-report',
    resolve: {
      breadcrumb: i18nBreadcrumbResolver,
    },
    data: {
      title: 'admin.reports.catalogue.title',
      breadcrumbKey: 'admin.reports.catalogue',
    },
    loadComponent: () => import('./catalogue-report.component').then((m) => m.CatalogueReportComponent),
    canActivate: [authenticatedGuard],
  },]
