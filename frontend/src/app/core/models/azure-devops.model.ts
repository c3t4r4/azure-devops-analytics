export interface AzureProject {
  id: string; name: string; description?: string; state: string;
  visibility?: string; lastUpdateTime: string; url?: string; orgName?: string;
}
export interface ProjectWithDetails extends AzureProject {
  currentSprintName?: string;
  completedCount: number;
  incompleteCount: number;
  lastWorkItemUpdate?: string;
  projectStartDate?: string;
}
export interface AzurePipeline {
  id: number; name: string; status: string; result: string;
  sourceBranch?: string; startTime?: string; finishTime?: string;
  requestedBy?: string; projectId?: string; url?: string; orgName?: string; projectName?: string;
}
export interface AzureRelease {
  id: number; name: string; status: string; environmentName?: string;
  createdBy?: string; createdOn?: string; modifiedOn?: string;
  releaseDefinitionName?: string; url?: string; orgName?: string; projectName?: string;
}
export interface AzureWorkItem {
  id: number; title: string; state: string; workItemType: string;
  assignedTo?: string; priority?: string; changedDate?: string;
  iterationPath?: string; iteration?: string; url?: string; orgName?: string; projectName?: string; projectId?: string;
}
export interface AzureRepository {
  id: string; name: string; defaultBranch?: string; size: number;
  remoteUrl?: string; webUrl?: string; lastCommitDate?: string; projectName?: string;
}
export interface AzureTeam {
  id: string; name: string; description?: string; url?: string;
  projectId?: string; projectName?: string; memberCount?: number;
}
export interface AzureTeamMember {
  id: string; displayName: string; uniqueName?: string; imageUrl?: string;
}
export interface AzureSprint {
  id: string; name: string; path: string; status?: string;
  startDate?: string; finishDate?: string;
  teamId?: string; teamName?: string; projectName?: string;
  workItems?: AzureWorkItem[];
  workItemCount?: number;
  completedCount?: number;
  incompleteCount?: number;
}
export interface AzureWiki {
  id: string; name: string; type: string; url?: string;
  remoteUrl?: string; projectId?: string; projectName?: string;
}
export interface AzureWikiPage {
  id: number; path: string; content?: string; url?: string;
  isParentPage: boolean; subPages?: AzureWikiPage[];
}
export interface AzureTaskGroup {
  id: string; name: string; category?: string; revision: number;
  createdOn?: string; createdBy?: string; comment?: string;
}
export interface AzurePackageFeed {
  id: string; name: string; description?: string; url?: string; isReadOnly: boolean; lastUpdated?: string;
}
export interface AzurePackage {
  id: string; name: string; version?: string; protocolType?: string; publishDate?: string;
}
export interface AzureMemberEntitlement {
  id: string; displayName: string; uniqueName?: string; accessLevel?: string;
  status?: string; lastAccessedDate?: string; projectEntitlements?: string[];
}
export interface UserActivityEntry {
  userId: string; displayName: string; uniqueName?: string;
  commitCount: number; workItemsChanged: number; pullRequestsCreated: number;
  buildsTriggered: number; totalScore: number;
}
export interface UserActivityRanking {
  period: string; days: number; from: string; to: string;
  rankings: UserActivityEntry[];
}
export interface ProjectActivityEntry {
  projectId: string; projectName: string; orgName: string;
  workItemsChanged: number; commits: number; builds: number;
  pullRequests: number; activityScore: number;
}
export interface ProjectPriorityReport {
  period: string; days: number; from: string; to: string;
  projects: ProjectActivityEntry[];
}
export interface DashboardSummary {
  totalOrganizations: number; totalProjects: number;
  activePipelines: number; failingPipelines: number; succeededPipelines: number;
  totalWorkItems: number; totalRepositories: number; organizations: OrgSummary[];
  currentSprintProjects?: SprintProgressEntry[];
}
export interface OrgSummary {
  orgName: string; projectCount: number; activePipelines: number; failingPipelines: number;
}
export interface SprintProgressEntry {
  orgName: string; projectId: string; projectName: string;
  teamId: string; teamName: string; sprintId: string; sprintName: string;
  totalItems: number; completedCount: number; incompleteCount: number;
  startDate?: string; finishDate?: string;
}
export interface TimelineSprintEntry {
  orgName: string; projectId: string; projectName: string;
  teamId: string; teamName: string; sprintId: string; sprintName: string;
  startDate?: string; finishDate?: string; status?: string;
}
export interface TimelineProjectEntry {
  orgName: string; projectId: string; projectName: string;
  startDate?: string; endDate?: string;
}
export interface TimelineResponse {
  projects: TimelineProjectEntry[];
  sprints: TimelineSprintEntry[];
}

export interface TodayUpdateEntry {
  orgName: string;
  projectId: string;
  projectName: string;
  workItemId: number;
  title: string;
  workItemType: string;
  changeType: 'Created' | 'Completed' | 'Updated';
  state: string;
  changedDate: string;
  createdDate?: string;
  url?: string;
}

export interface TodayUpdatesResponse {
  updates: TodayUpdateEntry[];
}
