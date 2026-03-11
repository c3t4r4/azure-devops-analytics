import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AzureDevOpsService } from './azure-devops.service';
import type { DashboardSummary } from '../models/azure-devops.model';

describe('AzureDevOpsService', () => {
  let service: AzureDevOpsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AzureDevOpsService],
    });
    service = TestBed.inject(AzureDevOpsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getDashboardSummary should return summary from API', async () => {
    const mockSummary: DashboardSummary = {
      totalOrganizations: 2,
      totalProjects: 5,
      activePipelines: 3,
      failingPipelines: 1,
      succeededPipelines: 2,
      totalWorkItems: 42,
      totalRepositories: 8,
      organizations: [],
      currentSprintProjects: undefined,
    };

    const result = firstValueFrom(service.getDashboardSummary());
    const req = httpMock.expectOne('/api/dashboard/summary');
    expect(req.request.method).toBe('GET');
    req.flush(mockSummary);
    const data = await result;
    expect(data).toEqual(mockSummary);
  });
});
