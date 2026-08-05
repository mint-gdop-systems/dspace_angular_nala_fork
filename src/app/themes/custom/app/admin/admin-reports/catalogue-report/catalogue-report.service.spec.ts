import { of } from 'rxjs';

import { RestRequestMethod } from 'src/app/core/data/rest-request-method';
import { DspaceRestService } from 'src/app/core/dspace-rest/dspace-rest.service';

import { CatalogueReportService } from './catalogue-report.service';

describe('CatalogueReportService', () => {
  let service: CatalogueReportService;
  let restService: jasmine.SpyObj<DspaceRestService>;

  beforeEach(() => {
    restService = jasmine.createSpyObj('DspaceRestService', ['request']);
    service = new CatalogueReportService(restService);
  });

  it('should send UTC date values to the catalogue report endpoint', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';

    try {
      restService.request.and.returnValue(of({
        payload: [],
        statusCode: 200,
        statusText: 'OK',
      } as any));

      const fromDate = new Date('2024-01-15T00:00:00.000Z');
      const toDate = new Date('2024-01-16T00:00:00.000Z');

      service.getCatalogueReport(fromDate, toDate, 10, 0).subscribe();

      expect(restService.request).toHaveBeenCalledWith(
        RestRequestMethod.GET,
        jasmine.stringMatching(/fromDate=2024-01-15/),
      );
      expect(restService.request).toHaveBeenCalledWith(
        RestRequestMethod.GET,
        jasmine.stringMatching(/toDate=2024-01-16/),
      );
    } finally {
      process.env.TZ = originalTz;
    }
  });
});
