import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  IPropertyPaneDropdownOption,
  PropertyPaneDropdown,
  PropertyPaneSlider,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { SPComponentLoader } from '@microsoft/sp-loader';

import * as strings from 'AssuranceLearningCalendarWebPartStrings';
import AssuranceLearningCalendar, { DEFAULT_SIDE_GUTTER } from './components/AssuranceLearningCalendar';
import { IAssuranceLearningCalendarProps } from './components/IAssuranceLearningCalendarProps';
import { ICourseService } from './services/ICourseService';
import { LocalCourseService } from './services/LocalCourseService';
import { DEFAULT_LIST_NAME, SharePointCourseService } from './services/SharePointCourseService';
import {
  DEFAULT_ADMIN_LIST_NAME,
  DEFAULT_VISITS_LIST_NAME,
  IAdminService,
  IVisitService
} from './services/IAdminService';
import { LocalAdminService, LocalVisitService } from './services/LocalAdminService';
import { SharePointAdminService, SharePointVisitService } from './services/SharePointAdminService';
import { ISPRest } from './services/SPRest';
import { ICurrentUser } from './models/IAdmin';

export type DataSource = 'Local' | 'SharePoint';

export interface IAssuranceLearningCalendarWebPartProps {
  dataSource: DataSource;
  listName: string;
  /** Optional absolute URL of the site holding the list; empty = current site. */
  siteUrl: string;
  title: string;
  questionsLinkText: string;
  questionsLinkUrl: string;
  contactEmail: string;
  heroImageUrl: string;
  tableHeight: number;
  /** Same look on every screen resolution (page scaled to the screen width; browser zoom still zooms). */
  fitToWidth: boolean;
  /** Side bar width on each side at 100% zoom, % of the screen width. */
  sideGutter: number;
  /** Side bar colour (any CSS colour); empty = transparent. */
  gutterColor: string;
  /** Admin access list title; empty = AssuranceLearningCalendarAdmins. */
  adminListName: string;
  /** Visit tracking list title; empty = AssuranceLearningCalendarVisits. */
  visitsListName: string;
  /** Record who visits the calendar and for how long. */
  trackVisits: boolean;
}

interface IServices {
  courses: ICourseService;
  admins: IAdminService;
  visits: IVisitService;
}

const FONT_URL: string = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap';

export default class AssuranceLearningCalendarWebPart extends BaseClientSideWebPart<IAssuranceLearningCalendarWebPartProps> {
  private _root: Root | undefined;
  private _services: IServices | undefined;
  private _serviceKey: string = '';
  /** Created once, so the component sees the same object on every render. */
  private _currentUser: ICurrentUser | undefined;

  protected onInit(): Promise<void> {
    try {
      SPComponentLoader.loadCss(FONT_URL);
    } catch {
      // Falls back to Segoe UI.
    }
    const user = this.context.pageContext.user;
    const legacy = this.context.pageContext.legacyPageContext as { isSiteAdmin?: boolean } | undefined;
    this._currentUser = {
      displayName: user.displayName,
      email: (user.email || user.loginName || '').toLowerCase(),
      isSiteAdmin: !!(legacy && legacy.isSiteAdmin)
    };
    return super.onInit();
  }

  public render(): void {
    const p: IAssuranceLearningCalendarWebPartProps = this.properties;
    const contactEmail: string = p.contactEmail || 'usaalearning2@deloitte.com';
    const services: IServices = this._getServices();
    const isSharePoint: boolean = p.dataSource === 'SharePoint';

    const element: React.ReactElement<IAssuranceLearningCalendarProps> = React.createElement(
      AssuranceLearningCalendar,
      {
        dataService: services.courses,
        dataKey: this._serviceKey,
        title: p.title || 'Assurance Virtual Learning Enrollment Calendar',
        questionsLinkText: p.questionsLinkText || 'Audit & Assurance Learning',
        questionsLinkUrl: p.questionsLinkUrl || `mailto:${contactEmail}`,
        contactEmail,
        heroImageUrl: p.heroImageUrl || undefined,
        tableHeight: p.tableHeight || 440,
        // Older instances have no value yet: treat that as on.
        fitToWidth: p.fitToWidth !== false,
        sideGutter: typeof p.sideGutter === 'number' ? p.sideGutter : DEFAULT_SIDE_GUTTER,
        gutterColor: (p.gutterColor || '').trim(),
        currentUser: this._currentUser,
        adminService: services.admins,
        visitService: services.visits,
        // Older instances have no value yet: treat that as on.
        trackVisits: p.trackVisits !== false,
        importTargetLabel: isSharePoint
          ? `the "${(p.listName || DEFAULT_LIST_NAME).trim()}" SharePoint list`
          : 'the local test list (changes last until the page is reloaded)'
      }
    );

    if (!this._root) {
      this._root = createRoot(this.domElement);
    }
    this._root.render(element);
  }

  protected onDispose(): void {
    if (this._root) {
      this._root.unmount();
      this._root = undefined;
    }
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  /** Course, admin and visit services for the chosen data source (made again when the source changes). */
  private _getServices(): IServices {
    const p: IAssuranceLearningCalendarWebPartProps = this.properties;
    const webUrl: string = (p.siteUrl || this.context.pageContext.web.absoluteUrl).trim();
    const listName: string = (p.listName || DEFAULT_LIST_NAME).trim();
    const adminList: string = (p.adminListName || DEFAULT_ADMIN_LIST_NAME).trim();
    const visitsList: string = (p.visitsListName || DEFAULT_VISITS_LIST_NAME).trim();
    const key: string = p.dataSource === 'SharePoint' ? `sp|${webUrl}|${listName}|${adminList}|${visitsList}` : 'local';

    if (!this._services || key !== this._serviceKey) {
      this._serviceKey = key;
      this._services =
        p.dataSource === 'SharePoint'
          ? {
              courses: new SharePointCourseService(this._rest, webUrl, listName),
              admins: new SharePointAdminService(this._rest, webUrl, adminList),
              visits: new SharePointVisitService(this._rest, webUrl, visitsList)
            }
          : { courses: new LocalCourseService(), admins: new LocalAdminService(), visits: new LocalVisitService() };
    }
    return this._services;
  }

  /** SharePoint REST calls for the services (reads, and writes with odata=nometadata). */
  private _rest: ISPRest = {
    get: (url: string): Promise<unknown> => this._fetchJson(url),
    post: async (
      url: string,
      body: unknown,
      headers?: Record<string, string>,
      keepalive?: boolean
    ): Promise<unknown> => {
      const response: SPHttpClientResponse = await this.context.spHttpClient.post(url, SPHttpClient.configurations.v1, {
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=nometadata',
          'odata-version': '',
          ...(headers || {})
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        keepalive
      });
      if (!response.ok) {
        throw await this._readError(response);
      }
      const text: string = response.status === 204 ? '' : await response.text();
      return text ? JSON.parse(text) : undefined;
    }
  };

  private _fetchJson = async (url: string): Promise<unknown> => {
    const response: SPHttpClientResponse = await this.context.spHttpClient.get(url, SPHttpClient.configurations.v1);
    if (!response.ok) {
      throw await this._readError(response);
    }
    return response.json();
  };

  /** "404 List 'X' does not exist ..." from a failed response. */
  private async _readError(response: SPHttpClientResponse): Promise<Error> {
    let detail: string = response.statusText;
    try {
      const body = (await response.json()) as {
        error?: { message?: string | { value?: string } };
        'odata.error'?: { message?: { value?: string } };
      };
      const raw =
        (body && body.error && body.error.message) || (body && body['odata.error'] && body['odata.error'].message);
      const text: string | undefined = typeof raw === 'string' ? raw : raw && raw.value;
      if (text) {
        detail = text;
      }
    } catch {
      // ignore body parse errors
    }
    return new Error(`${response.status} ${detail}`);
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    const sources: IPropertyPaneDropdownOption[] = [
      { key: 'Local', text: strings.DataSourceLocal },
      { key: 'SharePoint', text: strings.DataSourceSharePoint }
    ];
    const isSharePoint: boolean = this.properties.dataSource === 'SharePoint';

    return {
      pages: [
        {
          header: { description: strings.PropertyPaneDescription },
          groups: [
            {
              groupName: strings.DataGroupName,
              groupFields: [
                PropertyPaneDropdown('dataSource', { label: strings.DataSourceFieldLabel, options: sources }),
                PropertyPaneTextField('listName', {
                  label: strings.ListNameFieldLabel,
                  placeholder: DEFAULT_LIST_NAME,
                  disabled: !isSharePoint
                }),
                PropertyPaneTextField('siteUrl', {
                  label: strings.SiteUrlFieldLabel,
                  placeholder: strings.SiteUrlPlaceholder,
                  disabled: !isSharePoint
                })
              ]
            },
            {
              groupName: strings.DisplayGroupName,
              groupFields: [
                PropertyPaneTextField('title', { label: strings.TitleFieldLabel }),
                PropertyPaneTextField('questionsLinkText', { label: strings.QuestionsLinkTextFieldLabel }),
                PropertyPaneTextField('questionsLinkUrl', {
                  label: strings.QuestionsLinkUrlFieldLabel,
                  placeholder: 'mailto:… or https://…'
                }),
                PropertyPaneTextField('contactEmail', { label: strings.ContactEmailFieldLabel }),
                PropertyPaneTextField('heroImageUrl', {
                  label: strings.HeroImageUrlFieldLabel,
                  placeholder: strings.HeroImageUrlPlaceholder
                }),
                PropertyPaneSlider('tableHeight', {
                  label: strings.TableHeightFieldLabel,
                  min: 240,
                  max: 1200,
                  step: 20,
                  showValue: true
                })
              ]
            },
            {
              groupName: strings.AdminGroupName,
              groupFields: [
                PropertyPaneTextField('adminListName', {
                  label: strings.AdminListNameFieldLabel,
                  placeholder: DEFAULT_ADMIN_LIST_NAME,
                  disabled: !isSharePoint
                }),
                PropertyPaneTextField('visitsListName', {
                  label: strings.VisitsListNameFieldLabel,
                  placeholder: DEFAULT_VISITS_LIST_NAME,
                  disabled: !isSharePoint
                }),
                PropertyPaneToggle('trackVisits', {
                  label: strings.TrackVisitsFieldLabel,
                  onText: strings.TrackVisitsOn,
                  offText: strings.TrackVisitsOff,
                  checked: this.properties.trackVisits !== false
                })
              ]
            },
            {
              groupName: strings.LayoutGroupName,
              groupFields: [
                PropertyPaneToggle('fitToWidth', {
                  label: strings.FitToWidthFieldLabel,
                  onText: strings.FitToWidthOn,
                  offText: strings.FitToWidthOff,
                  checked: this.properties.fitToWidth !== false
                }),
                PropertyPaneSlider('sideGutter', {
                  label: strings.SideGutterFieldLabel,
                  min: 0,
                  max: 20,
                  step: 1,
                  showValue: true,
                  value:
                    typeof this.properties.sideGutter === 'number' ? this.properties.sideGutter : DEFAULT_SIDE_GUTTER,
                  disabled: this.properties.fitToWidth === false
                }),
                PropertyPaneTextField('gutterColor', {
                  label: strings.GutterColorFieldLabel,
                  placeholder: strings.GutterColorPlaceholder,
                  disabled: this.properties.fitToWidth === false
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
