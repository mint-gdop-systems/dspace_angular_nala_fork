import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map, shareReplay, switchMap, take, catchError, filter } from 'rxjs/operators';
import { AuthService } from '../../../../../../app/core/auth/auth.service';
import { DspaceRestService } from '../../../../../../app/core/dspace-rest/dspace-rest.service';
import { RESTURLCombiner } from '../../../../../../app/core/url-combiner/rest-url-combiner';
import { RawRestResponse } from '../../../../../../app/core/dspace-rest/raw-rest-response.model';
import { of } from 'rxjs';

export interface UserContentStats {
  mySubmission: {
    workspace: {
      total: number;
      rejected: number;
    };
    workflow: {
      total: number;
      reviewstep?: number;
      editstep?: number;
      finaleditstep: number;
    };
    archived: number;
    withdrawn: number;
  };
  myActions: {
    [step: string]: {
      [action: string]: number;
    };
  };
}

@Component({
  selector: 'ds-user-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit {

  stats$: Observable<UserContentStats>;

  constructor(
    protected authService: AuthService,
    protected restService: DspaceRestService
  ) { }

  /** Returns a stats object with all zeros — used when the user is not authenticated or the API call fails. */
  private emptyStats(): UserContentStats {
    return {
      mySubmission: {
        workspace: { total: 0, rejected: 0 },
        workflow: { total: 0, reviewstep: 0, editstep: 0, finaleditstep: 0 },
        archived: 0,
        withdrawn: 0
      },
      myActions: {}
    };
  }

  ngOnInit(): void {
    this.stats$ = this.authService.getAuthenticatedUserIdFromStore().pipe(
      filter((userId: string) => !!userId),
      take(1),
      switchMap((userId: string) => {
        const url = new RESTURLCombiner('statistics', 'usercontentstats', userId).toString();
        return this.restService.get(url).pipe(
          map((response: RawRestResponse) => {
            if (response && response.payload) {
              return response.payload as UserContentStats;
            }
            return this.emptyStats();
          }),
          catchError((err) => {
            console.error('Error fetching user content stats from REST API', err);
            return of(this.emptyStats());
          })
        );
      }),
      shareReplay(1)
    );
  }

  hasSubmissions(stats: UserContentStats): boolean {
    if (!stats || !stats.mySubmission) {
      return false;
    }
    const s = stats.mySubmission;
    return (s.workspace?.total > 0) ||
      (s.workflow?.total > 0) ||
      (s.workflow?.reviewstep > 0) ||
      (s.workflow?.editstep > 0) ||
      (s.workflow?.finaleditstep > 0) ||
      (s.archived > 0) ||
      (s.withdrawn > 0);
  }

  getActionEntries(actions: { [step: string]: { [action: string]: number } }): any[] {
    if (!actions) {
      return [];
    }
    return Object.entries(actions).map(([step, actionCounts]) => ({
      step,
      details: Object.entries(actionCounts).map(([action, count]) => ({ action, count }))
    }));
  }

  getActionCount(details: any[], actionName: string): number {
    const detail = details.find(d => d.action.toLowerCase() === actionName.toLowerCase());
    return detail ? detail.count : 0;
  }

  getStepLabel(step: string): string {
    const labels = {
      'editstep': 'Edit Step',
      'reviewstep': 'Review Step',
      'finaleditstep': 'Final Edit Step'
    };
    return labels[step] || step;
  }
}
