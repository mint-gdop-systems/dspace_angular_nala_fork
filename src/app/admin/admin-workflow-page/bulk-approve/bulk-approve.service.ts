import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

export interface WorkflowItemWithActions {
  id: string;
  title: string;
  hasApproveAction: boolean;
  collectionName?: string;
}

/**
 * Service for bulk approving workflow items.
 * Uses relative API paths (go through the Angular proxy) instead of absolute URLs.
 */
@Injectable({ providedIn: 'root' })
export class BulkApproveService {

  constructor(
    private http: HttpClient,
  ) {
  }

  /**
   * Fetch workflow items using the discover search API (same endpoint as the workflow tab).
   * Uses namespace-relative paths that go through the Angular dev proxy.
   */
  getItemsForFinalApproval(): Observable<WorkflowItemWithActions[]> {
    const namespace = environment.rest.nameSpace || '/server';
    const url = `${namespace}/api/discover/search/objects?configuration=workflow&page=0&size=100`;

    return this.http.get<any>(url).pipe(
      timeout(15000),
      map((response: any) => {
        const objects: any[] = response?._embedded?.searchResult?._embedded?.objects || [];

        if (objects.length === 0) {
          return [];
        }

        const items = objects.map((obj: any) => {
          const indexableObject = obj._embedded?.indexableObject;
          if (!indexableObject) {
            return null;
          }

          const id = indexableObject.id || '';
          const metadata = indexableObject.metadata || {};

          // Extract title from metadata
          let title = `Item ${id}`;
          if (metadata['dc.title'] && metadata['dc.title'].length > 0) {
            title = metadata['dc.title'][0].value || title;
          }

          // Extract collection name
          let collectionName: string | undefined;
          if (indexableObject._embedded?.owningCollection?.metadata?.['dc.title']) {
            const collValues = indexableObject._embedded.owningCollection.metadata['dc.title'];
            if (collValues.length > 0) {
              collectionName = collValues[0].value;
            }
          }

          return {
            id,
            title,
            hasApproveAction: true,
            collectionName,
          } as WorkflowItemWithActions;
        });

        return items.filter((item): item is WorkflowItemWithActions => item !== null);
      }),
      catchError((err) => {
        console.error('Error fetching workflow items from discover:', err);
        return of([]);
      }),
    );
  }

  /**
   * Approve a workflow item by POSTing to its submit_approve action endpoint.
   * @param workflowItemId The ID of the workflow item to approve
   */
  approveItem(workflowItemId: string): Observable<boolean> {
    const namespace = environment.rest.nameSpace || '/server';
    const url = `${namespace}/api/workflowitems/${workflowItemId}/actions/submit_approve`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post(url, {}, { headers }).pipe(
      timeout(15000),
      map(() => true),
      catchError((err) => {
        console.error(`Error approving item ${workflowItemId}:`, err);
        return of(false);
      }),
    );
  }
}
