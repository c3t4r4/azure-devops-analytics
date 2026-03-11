using DashboardDevops.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/organizations/{orgName}")]
public class ProjectsController(
    IOrganizationRepository orgRepo,
    IOrgDataCacheService cacheService,
    IAzureDevOpsService azureService) : ControllerBase
{
    private async Task<bool> OrgExistsAndActive(string orgName, CancellationToken ct)
    {
        var org = await orgRepo.GetByNameAsync(orgName, ct);
        return org is not null && org.IsActive;
    }

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects(string orgName, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound($"Organization '{orgName}' not found or inactive.");
        var data = await cacheService.GetProjectsAsync(orgName, ct);
        return Ok(data ?? []);
    }

    [HttpGet("projects-with-details")]
    public async Task<IActionResult> GetProjectsWithDetails(string orgName, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound($"Organization '{orgName}' not found or inactive.");
        var data = await cacheService.GetProjectsWithDetailsAsync(orgName, ct);
        return Ok(data ?? []);
    }

    [HttpGet("projects/{projectId}/pipelines")]
    public async Task<IActionResult> GetPipelines(string orgName, string projectId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetPipelinesAsync(orgName, projectId, ct);
        return Ok(data ?? []);
    }

    [HttpGet("projects/{projectId}/releases")]
    public async Task<IActionResult> GetReleases(string orgName, string projectId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetReleasesAsync(orgName, projectId, ct);
        return Ok(data ?? []);
    }

    [HttpGet("projects/{projectId}/work-items")]
    public async Task<IActionResult> GetWorkItems(
        string orgName, string projectId, [FromQuery] int max = 5000, CancellationToken ct = default)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetWorkItemsAsync(orgName, projectId, max, ct);
        return Ok(data ?? []);
    }

    [HttpGet("projects/{projectId}/repositories")]
    public async Task<IActionResult> GetRepositories(string orgName, string projectId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetRepositoriesAsync(orgName, projectId, ct);
        return Ok(data ?? []);
    }

    [HttpGet("projects/{projectId}/teams")]
    public async Task<IActionResult> GetTeams(string orgName, string projectId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetTeamsAsync(orgName, projectId, ct);
        return Ok(data ?? []);
    }

    [HttpGet("projects/{projectId}/teams/{teamId}/members")]
    public async Task<IActionResult> GetTeamMembers(string orgName, string projectId, string teamId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var org = await orgRepo.GetByNameAsync(orgName, ct);
        if (org is null) return NotFound();
        var data = await azureService.GetTeamMembersAsync(orgName, projectId, teamId, org.PatToken, ct);
        return Ok(data);
    }

    [HttpGet("projects/{projectId}/teams/{teamId}/sprints")]
    public async Task<IActionResult> GetSprints(string orgName, string projectId, string teamId, [FromQuery] bool includeCounts = false, CancellationToken ct = default)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetSprintsAsync(orgName, projectId, teamId, includeCounts, ct);
        return Ok(data ?? []);
    }

    [HttpGet("projects/{projectId}/teams/{teamId}/sprints/{iterationId}/workitems")]
    public async Task<IActionResult> GetSprintWorkItems(
        string orgName, string projectId, string teamId, string iterationId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var org = await orgRepo.GetByNameAsync(orgName, ct);
        if (org is null) return NotFound();
        var data = await azureService.GetSprintWorkItemsAsync(orgName, projectId, teamId, iterationId, org.PatToken, ct);
        return Ok(data);
    }

    [HttpGet("projects/{projectId}/wikis")]
    public async Task<IActionResult> GetWikis(string orgName, string projectId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetWikisAsync(orgName, projectId, ct);
        return Ok(data ?? []);
    }

    [HttpGet("wikis/{wikiId}/pages")]
    public async Task<IActionResult> GetWikiPages(string orgName, string wikiId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetWikiPagesAsync(orgName, wikiId, ct);
        if (data is not null) return Ok(data);
        var org = await orgRepo.GetByNameAsync(orgName, ct);
        if (org is null) return NotFound();
        var fromAzure = await azureService.GetWikiPagesAsync(orgName, wikiId, org.PatToken, ct);
        return Ok(fromAzure);
    }

    [HttpGet("projects/{projectId}/taskgroups")]
    public async Task<IActionResult> GetTaskGroups(string orgName, string projectId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetTaskGroupsAsync(orgName, projectId, ct);
        return Ok(data ?? []);
    }

    [HttpGet("feeds")]
    public async Task<IActionResult> GetFeeds(string orgName, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetPackageFeedsAsync(orgName, ct);
        return Ok(data ?? []);
    }

    [HttpGet("feeds/{feedId}/packages")]
    public async Task<IActionResult> GetFeedPackages(string orgName, string feedId, CancellationToken ct)
    {
        if (!await OrgExistsAndActive(orgName, ct)) return NotFound();
        var data = await cacheService.GetFeedPackagesAsync(orgName, feedId, ct);
        return Ok(data ?? []);
    }

    [HttpGet("entitlements")]
    public async Task<IActionResult> GetEntitlements(string orgName, CancellationToken ct)
    {
        var org = await orgRepo.GetByNameAsync(orgName, ct);
        if (org is null || !org.IsActive) return NotFound();
        var data = await azureService.GetMemberEntitlementsAsync(orgName, org.PatToken, ct);
        return Ok(data);
    }
}
