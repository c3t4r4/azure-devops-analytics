using System.Text.Json.Serialization;

namespace DashboardDevops.Infrastructure.AzureDevOps.Models;

public record AzureApiListResponse<T>(
    [property: JsonPropertyName("value")] IEnumerable<T> Value,
    [property: JsonPropertyName("count")] int Count
);

// Projects
public record AzureProjectApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("visibility")] string? Visibility,
    [property: JsonPropertyName("lastUpdateTime")] DateTime LastUpdateTime,
    [property: JsonPropertyName("url")] string? Url
);

// Builds
public record AzureBuildApi(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("buildNumber")] string BuildNumber,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("result")] string Result,
    [property: JsonPropertyName("sourceBranch")] string? SourceBranch,
    [property: JsonPropertyName("startTime")] DateTime? StartTime,
    [property: JsonPropertyName("finishTime")] DateTime? FinishTime,
    [property: JsonPropertyName("requestedBy")] AzureIdentityApi? RequestedBy,
    [property: JsonPropertyName("definition")] AzureDefinitionApi? Definition,
    [property: JsonPropertyName("_links")] AzureLinksApi? Links
);

public record AzureIdentityApi(
    [property: JsonPropertyName("displayName")] string? DisplayName,
    [property: JsonPropertyName("uniqueName")] string? UniqueName,
    [property: JsonPropertyName("id")] string? Id
);

public record AzureDefinitionApi(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string? Name
);

public record AzureLinksApi(
    [property: JsonPropertyName("web")] AzureLinkApi? Web
);

public record AzureLinkApi(
    [property: JsonPropertyName("href")] string? Href
);

// Releases
public record AzureReleaseApi(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("createdOn")] DateTime? CreatedOn,
    [property: JsonPropertyName("modifiedOn")] DateTime? ModifiedOn,
    [property: JsonPropertyName("createdBy")] AzureIdentityApi? CreatedBy,
    [property: JsonPropertyName("releaseDefinition")] AzureDefinitionApi? ReleaseDefinition,
    [property: JsonPropertyName("environments")] IEnumerable<AzureReleaseEnvironmentApi>? Environments
);

public record AzureReleaseEnvironmentApi(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("status")] string Status
);

// Work Items
public record AzureWorkItemApi(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("fields")] Dictionary<string, object>? Fields,
    [property: JsonPropertyName("url")] string? Url
);

public record AzureWiqlQuery(
    [property: JsonPropertyName("query")] string Query
);

public record AzureWiqlResponse(
    [property: JsonPropertyName("workItems")] IEnumerable<AzureWorkItemRef>? WorkItems
);

public record AzureWorkItemRef(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("url")] string? Url
);

// Repositories
public record AzureRepositoryApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("defaultBranch")] string? DefaultBranch,
    [property: JsonPropertyName("size")] long Size,
    [property: JsonPropertyName("remoteUrl")] string? RemoteUrl,
    [property: JsonPropertyName("webUrl")] string? WebUrl
);

// Commits
public record AzureCommitApi(
    [property: JsonPropertyName("commitId")] string CommitId,
    [property: JsonPropertyName("author")] AzureCommitAuthorApi? Author,
    [property: JsonPropertyName("committer")] AzureCommitAuthorApi? Committer,
    [property: JsonPropertyName("comment")] string? Comment,
    [property: JsonPropertyName("remoteUrl")] string? RemoteUrl
);

public record AzureCommitAuthorApi(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("date")] DateTime? Date
);

// Pull Requests
public record AzurePullRequestApi(
    [property: JsonPropertyName("pullRequestId")] int PullRequestId,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("createdBy")] AzureIdentityApi? CreatedBy,
    [property: JsonPropertyName("creationDate")] DateTime? CreationDate,
    [property: JsonPropertyName("closedDate")] DateTime? ClosedDate
);

// Teams
public record AzureTeamApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("projectId")] string? ProjectId,
    [property: JsonPropertyName("projectName")] string? ProjectName
);

public record AzureTeamMemberApi(
    [property: JsonPropertyName("identity")] AzureIdentityFullApi? Identity,
    [property: JsonPropertyName("isTeamAdmin")] bool IsTeamAdmin
);

public record AzureIdentityFullApi(
    [property: JsonPropertyName("id")] string? Id,
    [property: JsonPropertyName("displayName")] string? DisplayName,
    [property: JsonPropertyName("uniqueName")] string? UniqueName,
    [property: JsonPropertyName("imageUrl")] string? ImageUrl
);

// Iterations / Sprints
public record AzureIterationApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("attributes")] AzureIterationAttributesApi? Attributes
);

public record AzureIterationAttributesApi(
    [property: JsonPropertyName("startDate")] DateTime? StartDate,
    [property: JsonPropertyName("finishDate")] DateTime? FinishDate,
    [property: JsonPropertyName("timeFrame")] string? TimeFrame
);

public record AzureIterationWorkItemsResponse(
    [property: JsonPropertyName("workItemRelations")] IEnumerable<AzureWorkItemRelationApi>? WorkItemRelations
);

public record AzureWorkItemRelationApi(
    [property: JsonPropertyName("target")] AzureWorkItemRef? Target
);

// Wiki
public record AzureWikiApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("remoteUrl")] string? RemoteUrl,
    [property: JsonPropertyName("projectId")] string? ProjectId
);

public record AzureWikiPageApi(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("content")] string? Content,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("isParentPage")] bool IsParentPage,
    [property: JsonPropertyName("subPages")] IEnumerable<AzureWikiPageApi>? SubPages
);

// Task Groups
public record AzureTaskGroupApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("category")] string? Category,
    [property: JsonPropertyName("revision")] int Revision,
    [property: JsonPropertyName("createdOn")] DateTime? CreatedOn,
    [property: JsonPropertyName("createdBy")] AzureIdentityApi? CreatedBy,
    [property: JsonPropertyName("comment")] string? Comment
);

// Packaging
public record AzurePackageFeedApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("isReadOnly")] bool IsReadOnly
);

public record AzurePackageApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("protocolType")] string? ProtocolType,
    [property: JsonPropertyName("versions")] IEnumerable<AzurePackageVersionApi>? Versions
);

public record AzurePackageVersionApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("publishDate")] DateTime? PublishDate
);

// Member Entitlements
public record AzureMemberEntitlementApi(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("user")] AzureUserApi? User,
    [property: JsonPropertyName("accessLevel")] AzureAccessLevelApi? AccessLevel,
    [property: JsonPropertyName("lastAccessedDate")] DateTime? LastAccessedDate,
    [property: JsonPropertyName("projectEntitlements")] IEnumerable<AzureProjectEntitlementApi>? ProjectEntitlements
);

public record AzureUserApi(
    [property: JsonPropertyName("displayName")] string? DisplayName,
    [property: JsonPropertyName("uniqueName")] string? UniqueName,
    [property: JsonPropertyName("subjectKind")] string? SubjectKind
);

public record AzureAccessLevelApi(
    [property: JsonPropertyName("accountLicenseType")] string? AccountLicenseType,
    [property: JsonPropertyName("status")] string? Status
);

public record AzureProjectEntitlementApi(
    [property: JsonPropertyName("projectRef")] AzureProjectRefApi? ProjectRef
);

public record AzureProjectRefApi(
    [property: JsonPropertyName("id")] string? Id,
    [property: JsonPropertyName("name")] string? Name
);
