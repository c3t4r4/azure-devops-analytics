import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AzureProject, AzurePipeline, AzureRelease, AzureWorkItem, AzureRepository,
  AzureTeam, AzureTeamMember, AzureSprint, AzureWiki, AzureWikiPage,
  AzureTaskGroup, AzurePackageFeed, AzurePackage, AzureMemberEntitlement,
  UserActivityRanking, ProjectPriorityReport, DashboardSummary, ProjectWithDetails,
  TimelineResponse, TodayUpdatesResponse,
} from '../models/azure-devops.model';

@Injectable({ providedIn: 'root' })
export class AzureDevOpsService {
  private http = inject(HttpClient);
  private base = (org: string) => `/api/organizations/${encodeURIComponent(org)}`;

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>('/api/dashboard/summary');
  }
  getDashboardSummaryWithHash(): Observable<{ data: DashboardSummary; hash: string }> {
    return this.http.get<DashboardSummary>('/api/dashboard/summary', { observe: 'response' }).pipe(
      map(res => ({
        data: res.body!,
        hash: res.headers.get('X-Dashboard-Hash') ?? '',
      }))
    );
  }
  getTimeline(): Observable<TimelineResponse> {
    return this.http.get<TimelineResponse>('/api/dashboard/timeline');
  }
  getTodayUpdates(): Observable<TodayUpdatesResponse> {
    return this.http.get<TodayUpdatesResponse>('/api/dashboard/today-updates');
  }
  getTodayUpdatesWithHash(): Observable<{ data: TodayUpdatesResponse; hash: string }> {
    return this.http.get<TodayUpdatesResponse>('/api/dashboard/today-updates', { observe: 'response' }).pipe(
      map(res => ({
        data: res.body ?? { updates: [] },
        hash: res.headers.get('X-Dashboard-Hash') ?? '',
      }))
    );
  }

  // ─── Projects ──────────────────────────────────────────────────────────────
  getProjects(org: string): Observable<AzureProject[]> {
    return this.http.get<AzureProject[]>(`${this.base(org)}/projects`);
  }
  getProjectsWithDetails(org: string): Observable<ProjectWithDetails[]> {
    return this.http.get<ProjectWithDetails[]>(`${this.base(org)}/projects-with-details`);
  }

  // ─── Pipelines ─────────────────────────────────────────────────────────────
  getPipelines(org: string, projectId: string): Observable<AzurePipeline[]> {
    return this.http.get<AzurePipeline[]>(`${this.base(org)}/projects/${projectId}/pipelines`);
  }

  // ─── Releases ──────────────────────────────────────────────────────────────
  getReleases(org: string, projectId: string): Observable<AzureRelease[]> {
    return this.http.get<AzureRelease[]>(`${this.base(org)}/projects/${projectId}/releases`);
  }

  // ─── Work Items ────────────────────────────────────────────────────────────
  getWorkItems(org: string, projectId: string, max = 5000): Observable<AzureWorkItem[]> {
    return this.http.get<AzureWorkItem[]>(`${this.base(org)}/projects/${projectId}/work-items?max=${max}`);
  }

  // ─── Repositories ──────────────────────────────────────────────────────────
  getRepositories(org: string, projectId: string): Observable<AzureRepository[]> {
    return this.http.get<AzureRepository[]>(`${this.base(org)}/projects/${projectId}/repositories`);
  }

  // ─── Teams ─────────────────────────────────────────────────────────────────
  getTeams(org: string, projectId: string): Observable<AzureTeam[]> {
    return this.http.get<AzureTeam[]>(`${this.base(org)}/projects/${projectId}/teams`);
  }
  getTeamMembers(org: string, projectId: string, teamId: string): Observable<AzureTeamMember[]> {
    return this.http.get<AzureTeamMember[]>(`${this.base(org)}/projects/${projectId}/teams/${teamId}/members`);
  }

  // ─── Sprints ───────────────────────────────────────────────────────────────
  getSprints(org: string, projectId: string, teamId: string, includeCounts = false): Observable<AzureSprint[]> {
    const q = includeCounts ? '?includeCounts=true' : '';
    return this.http.get<AzureSprint[]>(`${this.base(org)}/projects/${projectId}/teams/${teamId}/sprints${q}`);
  }
  getSprintWorkItems(org: string, projectId: string, teamId: string, iterationId: string): Observable<AzureWorkItem[]> {
    return this.http.get<AzureWorkItem[]>(
      `${this.base(org)}/projects/${projectId}/teams/${teamId}/sprints/${iterationId}/workitems`
    );
  }

  // ─── Wiki ──────────────────────────────────────────────────────────────────
  getWikis(org: string, projectId: string): Observable<AzureWiki[]> {
    return this.http.get<AzureWiki[]>(`${this.base(org)}/projects/${projectId}/wikis`);
  }
  getWikiPages(org: string, wikiId: string): Observable<AzureWikiPage[]> {
    return this.http.get<AzureWikiPage[]>(`${this.base(org)}/wikis/${wikiId}/pages`);
  }

  // ─── Task Groups ───────────────────────────────────────────────────────────
  getTaskGroups(org: string, projectId: string): Observable<AzureTaskGroup[]> {
    return this.http.get<AzureTaskGroup[]>(`${this.base(org)}/projects/${projectId}/taskgroups`);
  }

  // ─── Packaging ─────────────────────────────────────────────────────────────
  getFeeds(org: string): Observable<AzurePackageFeed[]> {
    return this.http.get<AzurePackageFeed[]>(`${this.base(org)}/feeds`);
  }
  getFeedPackages(org: string, feedId: string): Observable<AzurePackage[]> {
    return this.http.get<AzurePackage[]>(`${this.base(org)}/feeds/${feedId}/packages`);
  }

  // ─── Entitlements ──────────────────────────────────────────────────────────
  getEntitlements(org: string): Observable<AzureMemberEntitlement[]> {
    return this.http.get<AzureMemberEntitlement[]>(`${this.base(org)}/entitlements`);
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────
  getUserRanking(org: string, days: number = 30): Observable<UserActivityRanking> {
    return this.http.get<UserActivityRanking>(`${this.base(org)}/analytics/user-ranking?days=${days}`);
  }
  getProjectPriority(org: string, days: number = 7): Observable<ProjectPriorityReport> {
    return this.http.get<ProjectPriorityReport>(`${this.base(org)}/analytics/project-priority?days=${days}`);
  }
}
