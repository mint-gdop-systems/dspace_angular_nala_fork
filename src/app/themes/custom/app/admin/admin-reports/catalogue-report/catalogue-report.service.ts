import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DspaceRestService } from 'src/app/core/dspace-rest/dspace-rest.service';
import { RestRequestMethod } from 'src/app/core/data/rest-request-method';
import { CatalogueReportItem, CatalogueReportResponse } from './catalogue-report.model';
import { environment } from 'src/environments/environment';

type InternalCatalogueReportItem = CatalogueReportItem & { collectionHref?: string };
interface InternalCatalogueReportResponse extends CatalogueReportResponse {
  items: InternalCatalogueReportItem[];
}

@Injectable({
  providedIn: 'root',
})
export class CatalogueReportService {
  constructor(private restService: DspaceRestService) {}

  getCatalogueReport(fromDate?: Date, toDate?: Date, pageSize: number = 10, page: number = 0, sortColumn?: string, sortDirection?: string): Observable<CatalogueReportResponse> {
    const scheme = environment.rest.ssl ? 'https' : 'http';
    const urlRestApp = environment.rest.baseUrl || `${scheme}://${environment.rest.host}:${environment.rest.port}${environment.rest.nameSpace}`;

    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      page: page.toString(),
    });

    if (fromDate) {
      params.set('fromDate', this.formatDateForApi(fromDate));
    }

    if (toDate) {
      params.set('toDate', this.formatDateForApi(toDate));
    }

    if (sortColumn && sortDirection) {
      params.set('sortColumn', sortColumn);
      params.set('sortDirection', sortDirection);
    }

    const primaryUrl = `${urlRestApp}/api/discover/search/objects?configuration=administrativeView&dsoType=ITEM&page=${page}&size=${pageSize}`;
    const fallbackUrl = `${urlRestApp}/api/cataloguereport/by-date-range?${params.toString()}`;
    const countUrl = `${urlRestApp}/api/discover/search/objects?configuration=administrativeView&dsoType=ITEM&page=0&size=1000`;

    return this.restService.request(
      RestRequestMethod.GET,
      primaryUrl,
    ).pipe(
      switchMap((response: any) => this.mapResponseWithCollections(response, pageSize, page, fromDate, toDate)),
      catchError(() => this.restService.request(
        RestRequestMethod.GET,
        fallbackUrl,
      ).pipe(
        switchMap((response: any) => this.mapResponseWithCollections(response, pageSize, page, fromDate, toDate)),
        catchError(() => of(this.createEmptyResponse(pageSize))),
      )),
    );
  }

  getFullCatalogueReport(fromDate?: Date, toDate?: Date, pageSize: number = 100): Observable<CatalogueReportResponse> {
    const scheme = environment.rest.ssl ? 'https' : 'http';
    const urlRestApp = environment.rest.baseUrl || `${scheme}://${environment.rest.host}:${environment.rest.port}${environment.rest.nameSpace}`;
    const fullUrl = `${urlRestApp}/api/discover/search/objects?configuration=administrativeView&dsoType=ITEM&page=0&size=1000`;

    if (fromDate || toDate) {
      const params = new URLSearchParams();
      if (fromDate) {
        const year = fromDate.getUTCFullYear();
        const month = (fromDate.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = fromDate.getUTCDate().toString().padStart(2, '0');
        params.set('fromDate', `${year}-${month}-${day}`);
      }
      if (toDate) {
        const year2 = toDate.getUTCFullYear();
        const month2 = (toDate.getUTCMonth() + 1).toString().padStart(2, '0');
        const day2 = toDate.getUTCDate().toString().padStart(2, '0');
        params.set('toDate', `${year2}-${month2}-${day2}`);
      }
      const fallbackUrl = `${urlRestApp}/api/cataloguereport/by-date-range?${params.toString()}`;
      return this.restService.request(RestRequestMethod.GET, fallbackUrl).pipe(
        switchMap((response: any) => this.mapResponseWithCollections(response, pageSize, 0, fromDate, toDate)),
        catchError(() => of(this.createEmptyResponse(pageSize))),
      );
    }

    return this.restService.request(RestRequestMethod.GET, fullUrl).pipe(
      switchMap((response: any) => this.mapResponseWithCollections(response, pageSize, 0, fromDate, toDate)),
      catchError(() => of(this.createEmptyResponse(pageSize))),
    );
  }

  exportToExcel(items: CatalogueReportItem[]): Observable<Blob> {
    const scheme = environment.rest.ssl ? 'https' : 'http';
    const urlRestApp = `${scheme}://${environment.rest.host}:${environment.rest.port}${environment.rest.nameSpace}`;
    
    // Create CSV content from items
    const headers = [
      '#', 'Record Type', 'Author', 'Title', 'Place of Publication', 'Publisher', 'Publication Date', 'Classification No', 'Location', 'No of Copies', 'ISBN', 'Public', 'Created Date', 'Last Edited Date'
    ];
    
    const htmlRows = [];
    htmlRows.push('<tr>' + headers.map((header) => `<th>${this.escapeExcelField(header)}</th>`).join('') + '</tr>');

    items.forEach((item, index) => {
      const row = [
        index + 1,
        item.recordType,
        item.author,
        item.title,
        item.placeOfPublication,
        item.publisher,
        item.publicationDate,
        item.classificationNo,
        item.location,
        item.noOfCopies.toString(),
        item.isbn,
        item.publicAccess,
        item.createdDate,
        item.lastEditedDate,
      ];
      htmlRows.push('<tr>' + row.map((field) => `<td>${this.escapeExcelField(String(field))}</td>`).join('') + '</tr>');
    });

    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Catalogue Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
<table>${htmlRows.join('')}</table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    return of(blob);
  }

  private mapResponse(response: any, pageSize: number, page: number, fromDate?: Date, toDate?: Date): InternalCatalogueReportResponse {
    const payload = response?.payload ?? response;
    const payloadItems = this.extractPayloadItems(payload);

    const rawItems = Array.isArray(payloadItems) ? payloadItems : [];
    const filteredItems = rawItems.filter((it: any) => this.matchesMadeAvailableDateRange(it, fromDate, toDate));
    const archivedCandidates = filteredItems.filter((it: any) => this.isArchivedItem(it) || this.isArchivedItem(this.getWrappedItem(it)));
    const itemsSource = archivedCandidates.length > 0 ? archivedCandidates : filteredItems;
    const allMappedItems: InternalCatalogueReportItem[] = itemsSource.map((item: any) => {
      const sourceItem = this.getWrappedItem(item);
      return {
        index: 0,
        recordType: '',
        collectionHref: this.getOwningCollectionHref(sourceItem),
        author: this.getFirstValue(sourceItem, ['author', 'authors', 'creator', 'dc.contributor.author', 'dc.creator']) || '',
        title: this.getFirstValue(sourceItem, ['title', 'name', 'dcTitle', 'dc.title']) || '',
        placeOfPublication: this.getFirstValue(sourceItem, ['placeOfPublication', 'dc.place', 'dc.publisher.place']) || '',
        publisher: this.getFirstValue(sourceItem, ['publisher', 'dc.publisher']) || '',
        publicationDate: this.formatReportDate(this.getFirstValue(sourceItem, ['publicationDate', 'dateIssued', 'issuedDate', 'dc.date.issued', 'dc.date']) || ''),
        classificationNo: this.getFirstValue(sourceItem, ['dc.identifier.classification', 'classificationNo', 'dc.identifier.other', 'dc.identifier.citation']) || '',
        location: this.getFirstValue(sourceItem, ['local.location', 'location', 'dc.coverage.spatial', 'dc.publisher.location']) || '',
        noOfCopies: this.getNumberValue(sourceItem, ['local.numberofcopies']) || 0,
        isbn: '',
        publicAccess: this.isPublic(sourceItem) ? 'Yes' : 'No',
        createdDate: this.formatReportDate(this.extractSubmittedDate(sourceItem) || this.getFirstValue(sourceItem, ['createdDate', 'dc.date.accessioned', 'dc.date.available']) || ''),
        lastEditedDate: this.formatReportDate(this.extractReviewedDate(sourceItem) || this.getFirstValue(sourceItem, ['lastEditedDate', 'dc.date.modified', 'dc.date.updated']) || ''),
      };
    });

    const totalCount = Math.max(this.getTotalCount(response, payload, allMappedItems.length) ?? 0, allMappedItems.length);

    // Detect whether the server returned paged results (server-side pagination)
    const serverProvidesPaging = Boolean(
      payload?.page || payload?.pageInfo || payload?._embedded?.searchResult?.page || payload?._embedded?.searchResult?.pageInfo || response?.page || response?.pageInfo
    );

    let pagedItems: InternalCatalogueReportItem[] = [];
    const responsePageNumber = this.getPageNumber(response, payload, page);
    const responsePageSize = this.getPageSize(response, payload, pageSize);

    if (serverProvidesPaging) {
      if (responsePageNumber === page) {
        pagedItems = allMappedItems.map((item, index) => ({
          ...item,
          index: (responsePageNumber * responsePageSize) + index,
        }));
      } else {
        const startIndex = page * pageSize;
        pagedItems = allMappedItems.slice(startIndex, startIndex + pageSize).map((item, index) => ({
          ...item,
          index: startIndex + index,
        }));
      }
    } else {
      const startIndex = page * pageSize;
      pagedItems = allMappedItems.slice(startIndex, startIndex + pageSize).map((item, index) => ({
        ...item,
        index: startIndex + index,
      }));
    }

    return {
      items: pagedItems,
      totalCount,
      page: responsePageNumber,
      pageSize: responsePageSize,
    };
  }

  private createEmptyResponse(pageSize: number): CatalogueReportResponse {
    return {
      items: [],
      totalCount: 0,
      page: 0,
      pageSize,
    };
  }

  private mapResponseWithCollections(response: any, pageSize: number, page: number, fromDate?: Date, toDate?: Date): Observable<CatalogueReportResponse> {
    const responseWithLinks = this.mapResponse(response, pageSize, page, fromDate, toDate);
    return this.loadCollectionNames(responseWithLinks.items).pipe(
      map((collectionNames) => this.applyCollectionNames(responseWithLinks, collectionNames)),
    );
  }

  private loadCollectionNames(items: InternalCatalogueReportItem[]): Observable<Record<string, string>> {
    const hrefs = Array.from(new Set(items.map((item) => item.collectionHref).filter(Boolean) as string[]));
    if (hrefs.length === 0) {
      return of({});
    }

    const requests = hrefs.map((href) =>
      this.restService.request(RestRequestMethod.GET, href).pipe(
        map((response: any) => [href, this.getCollectionNameFromPayload(response.payload ?? response)] as [string, string]),
        catchError(() => of([href, ''] as [string, string])),
      ),
    );

    return forkJoin(requests).pipe(
      map((entries) => Object.fromEntries(entries)),
    );
  }

  private applyCollectionNames(response: InternalCatalogueReportResponse, collectionNames: Record<string, string>): CatalogueReportResponse {
    return {
      ...response,
      items: response.items.map((item) => ({
        index: item.index,
        recordType: item.collectionHref ? (collectionNames[item.collectionHref] || '') : item.recordType,
        author: item.author,
        title: item.title,
        placeOfPublication: item.placeOfPublication,
        publisher: item.publisher,
        publicationDate: item.publicationDate,
        classificationNo: item.classificationNo,
        location: item.location,
        noOfCopies: item.noOfCopies,
        isbn: item.isbn,
        publicAccess: item.publicAccess,
        createdDate: item.createdDate,
        lastEditedDate: item.lastEditedDate,
      })),
    };
  }

  private getCollectionNameFromPayload(payload: any): string {
    return this.getFirstValue(payload, ['metadata.dc.title', 'dc.title', 'name', 'title']) || '';
  }

  private getOwningCollectionHref(item: any): string | undefined {
    return item?._links?.owningCollection?.href || item?.owningCollection?.href || item?.collection?.href;
  }

  private formatDateForApi(date: Date): string {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private matchesMadeAvailableDateRange(item: any, fromDate?: Date, toDate?: Date): boolean {
    const sourceItem = this.getWrappedItem(item);
    const madeAvailableValue = this.extractMadeAvailableDate(sourceItem);
    if (!madeAvailableValue) {
      return !fromDate && !toDate;
    }

    const itemDate = this.parseDateValue(madeAvailableValue);
    if (!itemDate) {
      return false;
    }

    if (fromDate) {
      const lowerBound = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate(), 0, 0, 0, 0));
      if (itemDate < lowerBound) {
        return false;
      }
    }

    if (toDate) {
      const upperBound = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate(), 23, 59, 59, 999));
      if (itemDate > upperBound) {
        return false;
      }
    }

    return true;
  }

  private extractMadeAvailableDate(item: any): string {
    const provenance = this.getMetadataArray(item, 'dc.description.provenance');
    for (const entry of provenance) {
      if (/made available in dspace on/i.test(entry)) {
        const match = entry.match(/made available in dspace on\s+(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:Z|[+\-]\d{2}:\d{2})?)?)/i);
        if (match) {
          return match[1];
        }
      }
    }
    return '';
  }

  private parseDateValue(value: string): Date | undefined {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private extractPayloadItems(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.items)) {
      return payload.items;
    }

    if (Array.isArray(payload?.results)) {
      return payload.results;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.content)) {
      return payload.content;
    }

    if (Array.isArray(payload?._embedded?.items)) {
      return payload._embedded.items;
    }

    if (Array.isArray(payload?._embedded?.searchResult?._embedded?.objects)) {
      return payload._embedded.searchResult._embedded.objects;
    }

    return [];
  }

  private getTotalCount(response: any, payload: any, fallbackCount: number): number {
    const candidates = [
      response?.totalCount,
      response?.payload?.totalCount,
      payload?.totalCount,
      payload?.totalElements,
      payload?.page?.totalElements,
      payload?.page?.totalCount,
      payload?.pageInfo?.totalElements,
      payload?.pageInfo?.totalCount,
      payload?._embedded?.searchResult?.page?.totalElements,
      payload?._embedded?.searchResult?.page?.totalCount,
      payload?._embedded?.searchResult?.pageInfo?.totalElements,
      payload?._embedded?.searchResult?.pageInfo?.totalCount,
      payload?._embedded?.page?.totalElements,
      payload?._embedded?.page?.totalCount,
      payload?._embedded?.pageInfo?.totalElements,
      payload?._embedded?.pageInfo?.totalCount,
    ];

    return candidates.find((value) => typeof value === 'number' && value > 0) ?? fallbackCount;
  }

  private getFirstValue(item: any, paths: string[]): string {
    for (const path of paths) {
      const value = this.resolveValue(item, path);
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          const firstValue = value[0];
          if (firstValue && typeof firstValue === 'object') {
            return this.getFirstValue(firstValue, ['value', 'content']);
          }
          return String(firstValue ?? '');
        }
        if (typeof value === 'object' && value.value !== undefined) {
          return String(value.value);
        }
        return String(value);
      }
    }
    return '';
  }

  private getMetadataArray(item: any, path: string): string[] {
    const value = this.resolveValue(item, path);
    if (Array.isArray(value)) {
      return value.map((entry) => typeof entry === 'object' && entry?.value !== undefined ? String(entry.value) : String(entry)).filter((entry) => entry);
    }
    if (typeof value === 'string') {
      return [value];
    }
    return [];
  }

  private extractSubmittedDate(item: any): string {
    const provenance = this.getMetadataArray(item, 'dc.description.provenance');
    for (const entry of provenance) {
      if (/Submitted by/i.test(entry)) {
        const match = entry.match(/on\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/);
        if (match) {
          return match[1];
        }
      }
    }
    return '';
  }

  private extractReviewedDate(item: any): string {
    const provenance = this.getMetadataArray(item, 'dc.description.provenance');
    
    // Look for the last entry with "Step: finaleditstep"
    for (let i = provenance.length - 1; i >= 0; i--) {
      const entry = provenance[i];
      if (/Step:\s*finaleditstep/i.test(entry)) {
        // Match ISO datetime with optional timezone (Z or ±HH:MM)
        const match = entry.match(/on\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+\-]\d{2}:\d{2})?)/);
        if (match) {
          return match[1];
        }
      }
    }

    return '';
  }

  private formatReportDate(value: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      const maybeDate = value.match(/(\d{4}-\d{2}-\d{2})/);
      if (maybeDate) {
        const [year, month, day] = maybeDate[1].split('-');
        return `${day}/${month}/${year}`;
      }
      return value;
    }

    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  private getNumberValue(item: any, paths: string[]): number {
    const value = this.getFirstValue(item, paths);
    return Number.isNaN(Number(value)) ? 0 : Number(value);
  }

  private resolveValue(item: any, path: string): any {
    if (!item || typeof item !== 'object') {
      return undefined;
    }

    if (path in item) {
      return item[path];
    }

    if (item.metadata && path in item.metadata) {
      return item.metadata[path];
    }

    const parts = path.split('.');
    let current: any = item;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private getWrappedItem(item: any): any {
    return item?._embedded?.indexableObject || item;
  }

  private isArchivedItem(item: any): boolean {
    if (!item || typeof item !== 'object') {
      return false;
    }

    if (item.withdrawn === true) {
      return false;
    }

    if (item.inArchive === true || item.isArchived === true) {
      return true;
    }

    if (item._embedded?.owningCollection || item.owningCollection || item.collection) {
      return true;
    }

    return false;
  }

  private getBooleanValue(item: any, paths: string[]): boolean {
    for (const path of paths) {
      const value = this.resolveValue(item, path);
      if (value === true || value === 'true' || value === 'True' || value === 'TRUE') {
        return true;
      }
      if (value === false || value === 'false' || value === 'False' || value === 'FALSE') {
        return false;
      }
    }
    return false;
  }

  private isPublic(item: any): boolean {
    return this.getBooleanValue(item, ['discoverable', 'isDiscoverable']);
  }

  private getCollectionName(item: any, wrappedItem?: any): string {
    if (!item || typeof item !== 'object') {
      return '';
    }

    const candidateItems = [item];
    if (wrappedItem && wrappedItem !== item) {
      candidateItems.unshift(wrappedItem);
    }

    for (const candidate of candidateItems) {
      const collectionObject = this.findCollectionObject(candidate);
      if (!collectionObject) {
        continue;
      }

      const collectionName = this.getFirstValue(collectionObject, ['dc.title', 'title', 'name']);
      if (collectionName) {
        return collectionName;
      }

      const titleMetadata = collectionObject.metadata?.['dc.title'];
      if (Array.isArray(titleMetadata) && titleMetadata.length > 0) {
        const firstValue = titleMetadata[0];
        if (firstValue && typeof firstValue === 'object' && firstValue.value) {
          return String(firstValue.value);
        }
        return String(firstValue || '');
      }

      const fallbackName = String(collectionObject.name || collectionObject.title || '').trim();
      if (fallbackName) {
        return fallbackName;
      }
    }

    return '';
  }

  private findCollectionObject(item: any): any {
    if (!item || typeof item !== 'object') {
      return null;
    }

    if (item._embedded?.owningCollection) {
      return item._embedded.owningCollection;
    }
    if (item._embedded?.collection) {
      return item._embedded.collection;
    }
    if (item.owningCollection) {
      return item.owningCollection;
    }
    if (item.collection) {
      return item.collection;
    }

    return null;
  }

  private getPageNumber(response: any, payload: any, fallbackPage: number): number {
    const pageFromResponse = response?.page?.number
      ?? payload?.page?.number
      ?? payload?._embedded?.searchResult?.page?.number
      ?? response?.page
      ?? payload?.page
      ?? fallbackPage;
    return typeof pageFromResponse === 'number' ? pageFromResponse : fallbackPage;
  }

  private getPageSize(response: any, payload: any, fallbackPageSize: number): number {
    const pageSizeFromResponse = response?.pageSize
      ?? payload?.pageSize
      ?? payload?._embedded?.searchResult?.page?.size
      ?? response?.page?.size
      ?? payload?.page?.size
      ?? fallbackPageSize;
    return typeof pageSizeFromResponse === 'number' ? pageSizeFromResponse : fallbackPageSize;
  }

  private escapeExcelField(field: string | number | null | undefined): string {
    if (field === undefined || field === null) {
      return '';
    }

    return String(field)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
