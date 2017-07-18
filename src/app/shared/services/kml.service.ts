import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import ellipsis from 'text-ellipsis';
import { Observable } from 'rxjs/Rx';

import { Story, User } from '../models';
import { UserService } from './user.service';

@Injectable()
export class KmlService {

  constructor(
    private datePipe: DatePipe,
    private userService: UserService,
  ) { }

  /**
   * Generates a KML with the journey placemarks.
   */
  placemarks(
    stories: Story[],
    user: User,
    { highlight, headers = true }: { highlight?: Story; headers?: boolean } = {},
  ): string {
    const content = stories.map((story) => {
      const isHighlighted = !!highlight && story.$key === highlight.$key
      return this.placemark(story, user, isHighlighted);
    }).join('\n');
    return this.wrap(content, headers);
  }

  /**
   * Generates a KML with the journey placemarks and the active story bubble.
   */
  placemark(
    story: Story,
    user: User,
    { highlight = false, headers = true }: { highlight?: boolean; headers?: boolean } = {}
  ): string {
    if (!story.isGeolocalized()) {
      return '';
    }
    const content = `<Placemark id="0">
      <name>${story.title}</name>
      <Point>
        <coordinates>${story.map.long},${story.map.lat},0</coordinates>
      </Point>
      <description>
        <![CDATA[
          ${KML_TEMPLATES.bubble({
            imageUrl: story.coverURL,
            dateText: this.datePipe.transform(story.dateStart),
            ownerDisplayName: user.displayName,
            description: story.description,
          })}
        ]]>
      </description>
      <gx:balloonVisibility>${highlight ? 1 : 0}</gx:balloonVisibility>
    </Placemark>`;
    return this.wrap(content, headers);
  }

  placemarkTour(
    story: Story,
    user: User,
    { headers = true }: { headers?: boolean } = {}
  ): string {
    if (!story.isGeolocalized()) {
      return '';
    }
    const placemarks = this.placemark(story, user, { headers: false });
    const content = `
      ${placemarks}
      <gx:Tour>
        <name>main</name>
        <gx:Playlist>
          <gx:AnimatedUpdate id="tour_1">
            <gx:duration>0.1</gx:duration>
            <Update>
              <targetHref/>
              <Change>
                <Placemark targetId="0">
                  <visibility>1</visibility>
                  <gx:balloonVisibility>1</gx:balloonVisibility>
                </Placemark>
              </Change>
            </Update>
          </gx:AnimatedUpdate>
          <gx:FlyTo id="tour_2">
            <gx:duration>1.0</gx:duration>
            <gx:flyToMode>smooth</gx:flyToMode>
            <LookAt>
              <longitude>0.598055555556</longitude>
              <latitude>41.6261111111</latitude>
              <altitude>1000</altitude>
              <heading>0</heading>
              <tilt>77</tilt>
              <range>5000</range>
              <gx:altitudeMode>relativeToSeaFloor </gx:altitudeMode>
            </LookAt>
          </gx:FlyTo>
          <gx:FlyTo id="tour_3">
            <gx:duration>1.0</gx:duration>
            <gx:flyToMode>smooth</gx:flyToMode>
            <LookAt>
              <longitude>0.598055555556</longitude>
              <latitude>41.6261111111</latitude>
              <altitude>1000</altitude>
              <heading>10</heading>
              <tilt>77</tilt>
              <range>5000</range>
              <gx:altitudeMode>relativeToSeaFloor </gx:altitudeMode>
            </LookAt>
            </gx:FlyTo>
        </gx:Playlist>
      </gx:Tour>
    `;
    return this.wrap(content, headers);
  }

  wrap(content: string, includeHeaders = true): string {
    const withHeaders = `<?xml version="1.0" encoding="UTF-8"?>
            <kml xmlns="http://www.opengis.net/kml/2.2"
                 xmlns:gx="http://www.google.com/kml/ext/2.2">
              <Document>${content}</Document>
            </kml>`;
    const minified = this.minify(includeHeaders ? withHeaders : content);
    return this.minify(minified);
  }

  private minify(kmlText: string): string {
    const minified = kmlText.trim().replace(/>\s+</g, '><');
    return minified;
  }
}

const KML_TEMPLATES = {
  bubble: ({imageUrl, dateText, ownerDisplayName, description}) => `
    ${imageUrl ? `<img class="banner" src="${imageUrl}" />` : ''}
    <div class="separator"></div>
    <div class="row tcenter">
      <span class="col2 date">${dateText}</span>
      <span class="col2 author">${ownerDisplayName}</span>
    </div>
    <div class="separator"></div>
    <pre class="description">${ellipsis(description, 450)}</pre>
    <div class="logo tcenter">
      <i class="fa fa-globe" aria-hidden="true"></i>
    </div>
    <div class="copyright tcenter">Geographical Memories @ 2017</div>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 600px;
      font-family: 'Helvetica', Arial, sans-serif;
    }

    .separator {
      margin-top: 15px;
      border-top: 1px solid #ddd;
      margin-bottom: 15px;
    }

    .row:after {
      display: block;
      content: '';
      clear: both;
    }

    .col2 {
      width: 50%;
      float: left;
    }

    .tcenter {
      text-align: center;
    }

    .inline > * {
      flex: 1;
    }

    .banner {
      width: 100%;
      max-height: 420px;
    }

    .date {
      display: block;
    }

    pre.description {
      font-family: inherit;
      text-align: justify;
      text-justify: inter-word;
      white-space: pre-wrap;
    }

    .logo {
      color: #4386fc;
    }

    .copyright {
      margin-top: 10px;
      font-size: 0.8em;
    }
    </style>
  `,
};
