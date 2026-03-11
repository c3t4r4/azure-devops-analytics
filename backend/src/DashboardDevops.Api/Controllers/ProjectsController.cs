using DashboardDevops.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/organizations/{orgName}")]
public class ProjectsController(IOrganizationRepository orgRepo, IAzureDevOpsService azureService) : ControllerBase
{
    private async Task<string?> GetPatOrNull(string orgName, CancellationToken ct)
    {
        var org = await orgRepo.GetByNameAsync(orgName, ct);
        return (org is null || !org.IsActive) ? null : org.PatToken;
    }

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects(string orgName, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound($"Organization '{orgName}' not found or inactive.");
        return Ok(await azureService.GetProjectsAsync(orgName, pat, ct));
    }

    [HttpGet("projects-with-details")]
    public async Task<IActionResult> GetProjectsWithDetails(string orgName, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound($"Organization '{orgName}' not found or inactive.");
        return Ok(await azureService.GetProjectsWithDetailsAsync(orgName, pat, ct));
    }

    [HttpGet("projects/{projectId}/pipelines")]
    public async Task<IActionResult> GetPipelines(string orgName, string projectId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetPipelinesAsync(orgName, projectId, pat, ct));
    }

    [HttpGet("projects/{projectId}/releases")]
    public async Task<IActionResult> GetReleases(string orgName, string projectId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetReleasesAsync(orgName, projectId, pat, ct));
    }

    [HttpGet("projects/{projectId}/work-items")]
    public async Task<IActionResult> GetWorkItems(
        string orgName, string projectId, [FromQuery] int max = 200, CancellationToken ct = default)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetWorkItemsAsync(orgName, projectId, pat, max, ct));
    }

    [HttpGet("projects/{projectId}/repositories")]
    public async Task<IActionResult> GetRepositories(string orgName, string projectId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetRepositoriesAsync(orgName, projectId, pat, ct));
    }

    [HttpGet("projects/{projectId}/teams")]
    public async Task<IActionResult> GetTeams(string orgName, string projectId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetTeamsAsync(orgName, projectId, pat, ct));
    }

    [HttpGet("projects/{projectId}/teams/{teamId}/members")]
    public async Task<IActionResult> GetTeamMembers(string orgName, string projectId, string teamId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetTeamMembersAsync(orgName, projectId, teamId, pat, ct));
    }

    [HttpGet("projects/{projectId}/teams/{teamId}/sprints")]
    public async Task<IActionResult> GetSprints(string orgName, string projectId, string teamId, [FromQuery] bool includeCounts = false, CancellationToken ct = default)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetSprintsAsync(orgName, projectId, teamId, pat, includeCounts, ct));
    }

    [HttpGet("projects/{projectId}/teams/{teamId}/sprints/{iterationId}/workitems")]
    public async Task<IActionResult> GetSprintWorkItems(
        string orgName, string projectId, string teamId, string iterationId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetSprintWorkItemsAsync(orgName, projectId, teamId, iterationId, pat, ct));
    }

    [HttpGet("projects/{projectId}/wikis")]
    public async Task<IActionResult> GetWikis(string orgName, string projectId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetWikisAsync(orgName, projectId, pat, ct));
    }

    [HttpGet("wikis/{wikiId}/pages")]
    public async Task<IActionResult> GetWikiPages(string orgName, string wikiId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetWikiPagesAsync(orgName, wikiId, pat, ct));
    }

    [HttpGet("projects/{projectId}/taskgroups")]
    public async Task<IActionResult> GetTaskGroups(string orgName, string projectId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetTaskGroupsAsync(orgName, projectId, pat, ct));
    }

    [HttpGet("feeds")]
    public async Task<IActionResult> GetFeeds(string orgName, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetPackageFeedsAsync(orgName, pat, ct));
    }

    [HttpGet("feeds/{feedId}/packages")]
    public async Task<IActionResult> GetFeedPackages(string orgName, string feedId, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetFeedPackagesAsync(orgName, feedId, pat, ct));
    }

    [HttpGet("entitlements")]
    public async Task<IActionResult> GetEntitlements(string orgName, CancellationToken ct)
    {
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetMemberEntitlementsAsync(orgName, pat, ct));
    }
}
