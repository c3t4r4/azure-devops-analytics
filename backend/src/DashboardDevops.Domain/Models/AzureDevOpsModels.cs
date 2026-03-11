namespace DashboardDevops.Domain.Models;

// ─── Projects ────────────────────────────────────────────────────────────────
public record AzureProject(
    string Id,
    string Name,
    string? Description,
    string State,
    string? Visibility,
    DateTime LastUpdateTime,
    string? Url
);

public record ProjectWithDetails(
    string Id,
    string Name,
    string? Description,
    string State,
    string? Visibility,
    DateTime LastUpdateTime,
    string? Url,
    string? CurrentSprintName,
    int CompletedCount,
    int IncompleteCount,
    DateTime? LastWorkItemUpdate,
    DateTime? ProjectStartDate = null
);

// ─── Pipelines / Builds ──────────────────────────────────────────────────────
public record AzurePipeline(
    int Id,
    string Name,
    string Status,
    string Result,
    string? SourceBranch,
    DateTime? StartTime,
    DateTime? FinishTime,
    string? RequestedBy,
    string? ProjectId,
    string? Url
);

// ─── Releases ────────────────────────────────────────────────────────────────
public record AzureRelease(
    int Id,
    string Name,
    string Status,
    string? EnvironmentName,
    string? CreatedBy,
    DateTime? CreatedOn,
    DateTime? ModifiedOn,
    string? ReleaseDefinitionName,
    string? Url
);

// ─── Work Items ───────────────────────────────────────────────────────────────
public record AzureWorkItem(
    int Id,
    string Title,
    string State,
    string WorkItemType,
    string? AssignedTo,
    string? Priority,
    DateTime? ChangedDate,
    string? IterationPath,
    string? Url
);

// ─── Repositories ─────────────────────────────────────────────────────────────
public record AzureRepository(
    string Id,
    string Name,
    string? DefaultBranch,
    long Size,
    int? ProjectId,
    string? RemoteUrl,
    string? WebUrl,
    DateTime? LastCommitDate
);

// ─── Teams ────────────────────────────────────────────────────────────────────
public record AzureTeam(
    string Id,
    string Name,
    string? Description,
    string? Url,
    string? ProjectId,
    string? ProjectName,
    int? MemberCount
);

public record AzureTeamMember(
    string Id,
    string DisplayName,
    string? UniqueName,
    string? ImageUrl
);

// ─── Sprints / Iterations ─────────────────────────────────────────────────────
public record AzureSprint(
    string Id,
    string Name,
    string Path,
    string? Status,
    DateTime? StartDate,
    DateTime? FinishDate,
    string? TeamId,
    string? TeamName,
    string? ProjectName,
    IEnumerable<AzureWorkItem>? WorkItems = null,
    int? WorkItemCount = null,
    int? CompletedCount = null,
    int? IncompleteCount = null
);

// ─── Wiki ─────────────────────────────────────────────────────────────────────
public record AzureWiki(
    string Id,
    string Name,
    string Type,
    string? Url,
    string? RemoteUrl,
    string? ProjectId,
    string? ProjectName
);

public record AzureWikiPage(
    int Id,
    string Path,
    string? Content,
    string? Url,
    bool IsParentPage,
    IEnumerable<AzureWikiPage>? SubPages = null
);

// ─── Task Groups ──────────────────────────────────────────────────────────────
public record AzureTaskGroup(
    string Id,
    string Name,
    string? Category,
    int Revision,
    DateTime? CreatedOn,
    string? CreatedBy,
    string? Comment
);

// ─── Packaging / Artifacts ────────────────────────────────────────────────────
public record AzurePackageFeed(
    string Id,
    string Name,
    string? Description,
    string? Url,
    bool IsReadOnly,
    DateTime? LastUpdated
);

public record AzurePackage(
    string Id,
    string Name,
    string? Version,
    string? ProtocolType,
    DateTime? PublishDate
);

// ─── Analytics: User Activity Ranking ────────────────────────────────────────
public record UserActivityEntry(
    string UserId,
    string DisplayName,
    string? UniqueName,
    int CommitCount,
    int WorkItemsChanged,
    int PullRequestsCreated,
    int BuildsTriggered,
    int TotalScore
);

public record UserActivityRanking(
    string Period,
    int Days,
    DateTime From,
    DateTime To,
    IEnumerable<UserActivityEntry> Rankings
);

// ─── Analytics: Project Priority ─────────────────────────────────────────────
public record ProjectActivityEntry(
    string ProjectId,
    string ProjectName,
    string OrgName,
    int WorkItemsChanged,
    int Commits,
    int Builds,
    int PullRequests,
    int ActivityScore
);

public record ProjectPriorityReport(
    string Period,
    int Days,
    DateTime From,
    DateTime To,
    IEnumerable<ProjectActivityEntry> Projects
);

// ─── Member Entitlements ──────────────────────────────────────────────────────
public record AzureMemberEntitlement(
    string Id,
    string DisplayName,
    string? UniqueName,
    string? AccessLevel,
    string? Status,
    DateTime? LastAccessedDate,
    IEnumerable<string>? ProjectEntitlements = null
);

// ─── Dashboard Summary ────────────────────────────────────────────────────────
public record DashboardSummary(
    int TotalOrganizations,
    int TotalProjects,
    int ActivePipelines,
    int FailingPipelines,
    int SucceededPipelines,
    int TotalWorkItems,
    int TotalRepositories,
    IEnumerable<OrgSummary> Organizations,
    IEnumerable<SprintProgressEntry>? CurrentSprintProjects = null
);

public record OrgSummary(
    string OrgName,
    int ProjectCount,
    int ActivePipelines,
    int FailingPipelines
);

public record SprintProgressEntry(
    string OrgName,
    string ProjectId,
    string ProjectName,
    string TeamId,
    string TeamName,
    string SprintId,
    string SprintName,
    int TotalItems,
    int CompletedCount,
    int IncompleteCount,
    DateTime? StartDate = null,
    DateTime? FinishDate = null
);

public record TimelineSprintEntry(
    string OrgName,
    string ProjectId,
    string ProjectName,
    string TeamId,
    string TeamName,
    string SprintId,
    string SprintName,
    DateTime? StartDate,
    DateTime? FinishDate,
    string? Status
);

public record TimelineProjectEntry(
    string OrgName,
    string ProjectId,
    string ProjectName,
    DateTime? StartDate,
    DateTime? EndDate
);

public record TimelineResponse(
    IEnumerable<TimelineProjectEntry> Projects,
    IEnumerable<TimelineSprintEntry> Sprints
);

// ─── Today Updates (Dashboard) ───────────────────────────────────────────────
public record TodayUpdateEntry(
    string OrgName,
    string ProjectId,
    string ProjectName,
    int WorkItemId,
    string Title,
    string WorkItemType,
    string ChangeType, // "Created" | "Completed" | "Updated"
    string State,
    DateTime ChangedDate,
    DateTime? CreatedDate,
    string? Url
);

public record TodayUpdatesResponse(
    IEnumerable<TodayUpdateEntry> Updates
);
