import { Component } from '@angular/core';

import { MarkdownDirective } from '../../shared/utils/markdown.directive';

@Component({
  selector: 'ds-base-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  imports: [
    MarkdownDirective,
  ],
})
/**
 * Component displaying the About page content.
 */
export class AboutComponent {
  public readonly aboutContent = `
  <article class="about-article">
    <h2>About</h2>
    <p>
      The Ethiopian National Archives and Library Service is a governmental body established by proclamation No.179/1999 as a legal framework and a nation-wide level of responsibilities. It was established in 1943 (originally named public library-wemezekir) and provides services such as research and study support, reading services, training, microfilm reading, audio and audio-video recording, and consultancy services for researchers, scholars, academicians, writers and the general public to foster an information-informed society.
    </p>

    <h3>Mission</h3>
    <p>
      Acquire, organize, and preserve information resources and create a national information system to make those resources available for study and research purposes.
    </p>

    <h3>Vision</h3>
    <p>
      Make the Ethiopian National Archives and Library Agency one of the leading African national archives and library centers where the culture of utilizing information supports democracy and development.
    </p>

    <h3>Goals</h3>
    <p>
      Collect, systematically organize, preserve, and make the information resources of the country available for study and research purposes.
    </p>

    <h3>Core Values</h3>
    <ul>
      <li>Respect professional ethics</li>
      <li>Effective and efficient delivery of services</li>
      <li>Participatory leadership</li>
      <li>Accountability</li>
      <li>Transparency</li>
      <li>Continuous improvement</li>
    </ul>

    <h3>Duties &amp; Responsibilities</h3>
    <ol>
      <li>Respect professional ethics</li>
      <li>Provide effective and efficient services</li>
      <li>Practice participatory leadership</li>
      <li>Be accountable and transparent</li>
      <li>Act as a national repository for printed and non-printed documents, manuscripts, historical archives and records</li>
      <li>Serve as the national registry center for ISBN</li>
      <li>Make efforts to repatriate original documents or copies taken out of the country</li>
    </ol>
  </article>
  `;
}
