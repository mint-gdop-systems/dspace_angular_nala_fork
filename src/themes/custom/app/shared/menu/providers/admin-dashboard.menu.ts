import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthorizationDataService } from '../../../../../../app/core/data/feature-authorization/authorization-data.service';
import { MenuItemType } from '../../../../../../app/shared/menu/menu-item-type.model';
import { AbstractMenuProvider, PartialMenuSection } from '../../../../../../app/shared/menu/menu-provider.model';

@Injectable({ providedIn: 'root' })
export class AdminDashboardMenuProvider extends AbstractMenuProvider {

    constructor(
        protected authorizationService: AuthorizationDataService,
    ) {
        super();
    }

    public getSections(): Observable<PartialMenuSection[]> {
        return of([
            {
                id: 'admin-dashboard',
                visible: true, // Visible to all authenticated users
                model: {
                    type: MenuItemType.LINK,
                    text: 'menu.section.analytics',
                    link: '/statistics/admin-dashboard',
                },
                icon: 'chart-bar',
            },
        ]);
    }
}
