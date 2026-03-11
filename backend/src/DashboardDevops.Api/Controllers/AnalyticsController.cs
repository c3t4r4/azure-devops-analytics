using DashboardDevops.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/organizations/{orgName}/analytics")]
public class AnalyticsController(IOrganizationRepository orgRepo, IAzureDevOpsService azureService) : ControllerBase
{
    private async Task<string?> GetPatOrNull(string orgName, CancellationToken ct)
    {
        var org = await orgRepo.GetByNameAsync(orgName, ct);
        return (org is null || !org.IsActive) ? null : org.PatToken;
    }

    [HttpGet("user-ranking")]
    public async Task<IActionResult> GetUserRanking(
        string orgName, [FromQuery] int days = 30, CancellationToken ct = default)
    {
        if (days is not (7 or 30 or 60)) days = 30;
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetUserActivityRankingAsync(orgName, pat, days, ct));
    }

    [HttpGet("project-priority")]
    public async Task<IActionResult> GetProjectPriority(
        string orgName, [FromQuery] int days = 7, CancellationToken ct = default)
    {
        if (days is not (7 or 30)) days = 7;
        var pat = await GetPatOrNull(orgName, ct);
        if (pat is null) return NotFound();
        return Ok(await azureService.GetProjectPriorityAsync(orgName, pat, days, ct));
    }
}
