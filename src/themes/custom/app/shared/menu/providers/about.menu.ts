import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { MenuItemType } from '../../../../../../app/shared/menu/menu-item-type.model';
import { AbstractMenuProvider, PartialMenuSection } from '../../../../../../app/shared/menu/menu-provider.model';

@Injectable({ providedIn: 'root' })
export class AboutMenuProvider extends AbstractMenuProvider {
  public getSections(): Observable<PartialMenuSection[]> {
    return of([
      {
        visible: true,
        model: {
          type: MenuItemType.LINK,
          text: 'menu.section.about',
          link: '/info/about',
        },
        icon: 'info-circle',
      },
    ] as PartialMenuSection[]);
  }
}
