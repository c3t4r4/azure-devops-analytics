import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import type { DashboardSummary } from '../../core/models/azure-devops.model';

describe('DashboardComponent', () => {
  const mockSummary: DashboardSummary = {
    totalOrganizations: 1,
    totalProjects: 3,
    activePipelines: 2,
    failingPipelines: 0,
    succeededPipelines: 2,
    totalWorkItems: 10,
    totalRepositories: 5,
    organizations: [],
    currentSprintProjects: undefined,
  };

  beforeEach(async () => {
    const mockAzureService = {
      getDashboardSummaryWithHash: () => of({ data: mockSummary, hash: 'h1' }),
      getTimeline: () => of({ projects: [], sprints: [] }),
      getTodayUpdatesWithHash: () => of({ data: { updates: [] }, hash: '' }),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule],
      providers: [{ provide: AzureDevOpsService, useValue: mockAzureService }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show Dashboard title', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const heading = el.querySelector('h2');
    expect(heading?.textContent).toContain('Dashboard');
  });
});
