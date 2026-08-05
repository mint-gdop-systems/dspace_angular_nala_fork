import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ThemedLoadingComponent } from 'src/app/shared/loading/themed-loading.component';
import { CatalogueReportItem } from './catalogue-report.model';
import { CatalogueReportService } from './catalogue-report.service';

@Component({
  selector: 'ds-catalogue-report',
  standalone: true,
  templateUrl: './catalogue-report.component.html',
  styleUrls: ['./catalogue-report.component.scss'],
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
    ReactiveFormsModule,
    RouterModule,
    ThemedLoadingComponent,
    TranslateModule,
  ],
})
export class CatalogueReportComponent implements OnInit {
  results: CatalogueReportItem[] = [];
  loading$ = new BehaviorSubject<boolean>(false);
  resultsCount$ = new BehaviorSubject<number>(0);
  dateRange$ = new BehaviorSubject<string | null>(null);
  error$ = new Subject<string | null>();
  pageSizeOptions = [10, 25, 50, 100];
  pageSize = 10;
  pageIndex = 0;
  exportEnabled$ = new BehaviorSubject<boolean>(false);
  fromDateControl = new FormControl<string | null>(null);
  toDateControl = new FormControl<string | null>(null);

  constructor(
    private translateService: TranslateService,
    private catalogueReportService: CatalogueReportService,
  ) {}

  get totalPages(): number {
    const totalCount = this.resultsCount$.value || 0;
    return totalCount > 0 ? Math.ceil(totalCount / this.pageSize) : 1;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  get hasPreviousPage(): boolean {
    return this.pageIndex > 0;
  }

  get hasNextPage(): boolean {
    return this.pageIndex < this.totalPages - 1;
  }

  ngOnInit(): void {
    this.resultsCount$.next(0);
    this.exportEnabled$.next(false);
    this.generateReport();
  }

  generateReport(): void {
    this.loading$.next(true);
    this.error$.next(null);
    this.dateRange$.next(null);
    this.pageIndex = 0;

    const from = this.fromDateControl.value ? new Date(this.fromDateControl.value) : undefined;
    const to = this.toDateControl.value ? new Date(this.toDateControl.value) : undefined;

    this.catalogueReportService.getCatalogueReport(from, to, this.pageSize, 0)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        catchError(() => {
          this.loading$.next(false);
          this.error$.next(this.translateService.instant('admin.reports.catalogue.errorLoading'));
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.results = response.items;
          this.resultsCount$.next(response.totalCount);
          this.exportEnabled$.next(response.items.length > 0);
          this.loading$.next(false);
        }
      });
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadPage(this.pageIndex, this.pageSize);
  }

  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) {
      return;
    }
    this.pageIndex = page;
    this.loadPage(page, this.pageSize);
  }

  private loadPage(page: number, pageSize: number): void {
    this.loading$.next(true);
    const from = this.fromDateControl.value ? new Date(this.fromDateControl.value) : undefined;
    const to = this.toDateControl.value ? new Date(this.toDateControl.value) : undefined;

    this.catalogueReportService.getCatalogueReport(from, to, pageSize, page)
      .pipe(
        catchError(() => {
          this.loading$.next(false);
          this.error$.next(this.translateService.instant('admin.reports.catalogue.errorLoading'));
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.results = response.items;
          this.resultsCount$.next(response.totalCount);
          this.exportEnabled$.next(response.items.length > 0);
          this.loading$.next(false);
        }
      });
  }

  onSortChange(event: any): void {
    this.loading$.next(true);
    const sortColumn = event.active;
    const sortDirection = event.direction;

    this.pageIndex = 0;
    const from = this.fromDateControl.value ? new Date(this.fromDateControl.value) : undefined;
    const to = this.toDateControl.value ? new Date(this.toDateControl.value) : undefined;

    this.catalogueReportService.getCatalogueReport(from, to, this.pageSize, 0, sortColumn, sortDirection)
      .pipe(
        catchError(() => {
          this.loading$.next(false);
          this.error$.next(this.translateService.instant('admin.reports.catalogue.errorLoading'));
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.results = response.items;
          this.resultsCount$.next(response.totalCount);
          this.exportEnabled$.next(response.items.length > 0);
          this.loading$.next(false);
        }
      });
  }

  exportToExcel(): void {
    if (this.resultsCount$.value === 0) {
      return;
    }

    this.loading$.next(true);
    const from = this.fromDateControl.value ? new Date(this.fromDateControl.value) : undefined;
    const to = this.toDateControl.value ? new Date(this.toDateControl.value) : undefined;

    this.catalogueReportService.getFullCatalogueReport(from, to, this.pageSize)
      .pipe(
        catchError(() => {
          this.loading$.next(false);
          this.error$.next(this.translateService.instant('admin.reports.catalogue.errorExporting'));
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.loading$.next(false);
        if (!response || response.items.length === 0) {
          return;
        }

        this.catalogueReportService.exportToExcel(response.items)
          .subscribe({
            next: (blob) => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `catalogue-report-${new Date().getTime()}.xls`;
              link.click();
              window.URL.revokeObjectURL(url);
            },
            error: () => {
              this.error$.next(this.translateService.instant('admin.reports.catalogue.errorExporting'));
            },
          });
      });
  }

  clearError(): void {
    this.error$.next(null);
  }

}
