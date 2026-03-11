using DashboardDevops.Domain.Models;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(Domain.Interfaces.IDashboardCacheService cacheService) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var (summary, hash) = await cacheService.GetSummaryAsync(ct);
        if (summary is null) return Ok(new DashboardSummary(0, 0, 0, 0, 0, 0, 0, [], null));
        if (!string.IsNullOrEmpty(hash)) Response.Headers["X-Dashboard-Hash"] = hash;
        return Ok(summary);
    }

    [HttpGet("timeline")]
    public async Task<IActionResult> GetTimeline(CancellationToken ct)
    {
        var (timeline, hash) = await cacheService.GetTimelineAsync(ct);
        if (timeline is null) return Ok(new TimelineResponse([], []));
        if (!string.IsNullOrEmpty(hash)) Response.Headers["X-Dashboard-Hash"] = hash;
        return Ok(timeline);
    }

    [HttpGet("today-updates")]
    public async Task<IActionResult> GetTodayUpdates(CancellationToken ct)
    {
        var (updates, hash) = await cacheService.GetTodayUpdatesAsync(ct);
        if (updates is null) return Ok(new TodayUpdatesResponse([]));
        if (!string.IsNullOrEmpty(hash)) Response.Headers["X-Dashboard-Hash"] = hash;
        return Ok(updates);
    }
}
