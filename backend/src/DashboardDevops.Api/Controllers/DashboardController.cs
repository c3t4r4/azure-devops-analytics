using DashboardDevops.Domain.Interfaces;
using DashboardDevops.Domain.Models;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(IOrganizationRepository orgRepo, IAzureDevOpsService azureService) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummary>> GetSummary(CancellationToken ct)
    {
        var orgs = await orgRepo.GetAllAsync(ct);
        var activeOrgs = orgs.Where(o => o.IsActive)
                             .Select(o => (o.Name, o.PatToken));

        var summary = await azureService.GetDashboardSummaryAsync(activeOrgs, ct);
        return Ok(summary);
    }

    [HttpGet("timeline")]
    public async Task<ActionResult<TimelineResponse>> GetTimeline(CancellationToken ct)
    {
        var orgs = await orgRepo.GetAllAsync(ct);
        var activeOrgs = orgs.Where(o => o.IsActive)
                             .Select(o => (o.Name, o.PatToken));

        var timeline = await azureService.GetTimelineAsync(activeOrgs, ct);
        return Ok(timeline);
    }

    [HttpGet("today-updates")]
    public async Task<ActionResult<TodayUpdatesResponse>> GetTodayUpdates(CancellationToken ct)
    {
        var orgs = await orgRepo.GetAllAsync(ct);
        var activeOrgs = orgs.Where(o => o.IsActive)
                             .Select(o => (o.Name, o.PatToken));

        var updates = await azureService.GetTodayUpdatesAsync(activeOrgs, ct);
        return Ok(updates);
    }
}
