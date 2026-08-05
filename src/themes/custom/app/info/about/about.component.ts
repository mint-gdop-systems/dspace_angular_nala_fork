import { Component } from '@angular/core';

import { MarkdownDirective } from '../../../../../app/shared/utils/markdown.directive';
import { AboutComponent as BaseComponent } from '../../../../../app/info/about/about.component';

@Component({
  selector: 'ds-themed-about',
  styleUrls: ['../../../../../app/info/about/about.component.scss'],
  templateUrl: '../../../../../app/info/about/about.component.html',
  imports: [
    MarkdownDirective,
  ],
})
export class AboutComponent extends BaseComponent {
}
