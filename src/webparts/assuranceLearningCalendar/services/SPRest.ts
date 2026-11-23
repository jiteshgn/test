/**
 * Minimal SharePoint REST client. The web part supplies it (built on SPHttpClient),
 * so the services have no SPFx dependency and stay testable.
 */
export interface ISPRest {
  /** Authenticated GET; resolves with the parsed JSON body. */
  get(url: string): Promise<unknown>;
  /**
   * Authenticated POST with a JSON body (odata=nometadata).
   * Resolves with the parsed JSON body, or undefined for an empty response (204).
   * `keepalive` lets the request finish while the page is closing.
   */
  post(url: string, body: unknown, headers?: Record<string, string>, keepalive?: boolean): Promise<unknown>;
}

export type SPItem = Record<string, unknown>;

interface ISPCollection {
  value?: SPItem[];
  d?: { results?: SPItem[]; __next?: string };
  '@odata.nextLink'?: string;
  'odata.nextLink'?: string;
}

/** `.../_api/web/lists/getbytitle('List')` */
export function listUrl(webUrl: string, listName: string): string {
  return `${webUrl.replace(/\/+$/, '')}/_api/web/lists/getbytitle('${encodeURIComponent(listName.replace(/'/g, "''"))}')`;
}

/** Quotes a value for an OData $filter. */
export function odataString(value: string): string {
  return `'${encodeURIComponent(value.replace(/'/g, "''"))}'`;
}

/** Reads every page of an items query. */
export async function getAllItems(rest: ISPRest, firstUrl: string): Promise<SPItem[]> {
  const items: SPItem[] = [];
  let url: string | undefined = firstUrl;
  while (url) {
    const page: ISPCollection = (await rest.get(url)) as ISPCollection;
    const rows: SPItem[] = page.value || (page.d && page.d.results) || [];
    items.push(...rows);
    url = page['@odata.nextLink'] || page['odata.nextLink'] || (page.d && page.d.__next) || undefined;
  }
  return items;
}

/** Creates a list item; resolves with its Id. */
export async function addItem(rest: ISPRest, list: string, fields: SPItem, keepalive?: boolean): Promise<string> {
  const created = (await rest.post(`${list}/items`, fields, undefined, keepalive)) as SPItem | undefined;
  return created && created.Id !== undefined ? String(created.Id) : '';
}

/** Changes some fields of a list item. */
export function updateItem(
  rest: ISPRest,
  list: string,
  id: string,
  fields: SPItem,
  keepalive?: boolean
): Promise<unknown> {
  return rest.post(
    `${list}/items(${encodeURIComponent(id)})`,
    fields,
    { 'IF-MATCH': '*', 'X-HTTP-Method': 'MERGE' },
    keepalive
  );
}

/** Deletes a list item (it goes to the site recycle bin). */
export function deleteItem(rest: ISPRest, list: string, id: string): Promise<unknown> {
  return rest.post(`${list}/items(${encodeURIComponent(id)})`, undefined, {
    'IF-MATCH': '*',
    'X-HTTP-Method': 'DELETE'
  });
}

export function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

export function asNumber(value: unknown): number {
  const n: number = typeof value === 'number' ? value : parseFloat(asText(value));
  return isNaN(n) ? 0 : n;
}

export function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  const text: string = asText(value).toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
}
