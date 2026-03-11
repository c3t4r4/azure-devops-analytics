using DashboardDevops.Api.Controllers;
using DashboardDevops.Domain.Interfaces;
using DashboardDevops.Domain.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace DashboardDevops.Tests.Api;

public class DashboardControllerTests
{
    private readonly Mock<IDashboardCacheService> _cacheService;
    private readonly DashboardController _controller;

    public DashboardControllerTests()
    {
        _cacheService = new Mock<IDashboardCacheService>();
        _controller = new DashboardController(_cacheService.Object)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
    }

    [Fact]
    public async Task GetSummary_WhenCacheReturnsData_ReturnsOkWithSummaryAndHashHeader()
    {
        var summary = new DashboardSummary(1, 2, 3, 4, 5, 6, 7, [], null);
        _cacheService.Setup(c => c.GetSummaryAsync(It.IsAny<CancellationToken>())).Returns(Task.FromResult<(DashboardSummary?, string?)>((summary, "abc123")));

        var result = await _controller.GetSummary(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(summary, ok.Value);
        Assert.True(_controller.Response.Headers.TryGetValue("X-Dashboard-Hash", out var hash));
        Assert.Equal("abc123", hash);
    }

    [Fact]
    public async Task GetSummary_WhenCacheReturnsNull_ReturnsOkWithEmptySummary()
    {
        _cacheService.Setup(c => c.GetSummaryAsync(It.IsAny<CancellationToken>())).Returns(Task.FromResult<(DashboardSummary?, string?)>((null, null)));

        var result = await _controller.GetSummary(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<DashboardSummary>(ok.Value);
        Assert.Equal(0, body.TotalOrganizations);
        Assert.Equal(0, body.TotalProjects);
    }

    [Fact]
    public async Task GetTimeline_WhenCacheReturnsData_ReturnsOkWithTimelineAndHashHeader()
    {
        var timeline = new TimelineResponse([], []);
        _cacheService.Setup(c => c.GetTimelineAsync(It.IsAny<CancellationToken>())).Returns(Task.FromResult<(TimelineResponse?, string?)>((timeline, "hash1")));

        var result = await _controller.GetTimeline(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(timeline, ok.Value);
        Assert.True(_controller.Response.Headers.TryGetValue("X-Dashboard-Hash", out var hash));
        Assert.Equal("hash1", hash);
    }

    [Fact]
    public async Task GetTimeline_WhenCacheReturnsNull_ReturnsOkWithEmptyTimeline()
    {
        _cacheService.Setup(c => c.GetTimelineAsync(It.IsAny<CancellationToken>())).Returns(Task.FromResult<(TimelineResponse?, string?)>((null, null)));

        var result = await _controller.GetTimeline(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<TimelineResponse>(ok.Value);
        Assert.Empty(body.Projects);
        Assert.Empty(body.Sprints);
    }

    [Fact]
    public async Task GetTodayUpdates_WhenCacheReturnsData_ReturnsOkWithUpdatesAndHashHeader()
    {
        var updates = new TodayUpdatesResponse([]);
        _cacheService.Setup(c => c.GetTodayUpdatesAsync(It.IsAny<CancellationToken>())).Returns(Task.FromResult<(TodayUpdatesResponse?, string?)>((updates, "hash2")));

        var result = await _controller.GetTodayUpdates(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(updates, ok.Value);
        Assert.True(_controller.Response.Headers.TryGetValue("X-Dashboard-Hash", out var hash));
        Assert.Equal("hash2", hash);
    }

    [Fact]
    public async Task GetTodayUpdates_WhenCacheReturnsNull_ReturnsOkWithEmptyUpdates()
    {
        _cacheService.Setup(c => c.GetTodayUpdatesAsync(It.IsAny<CancellationToken>())).Returns(Task.FromResult<(TodayUpdatesResponse?, string?)>((null, null)));

        var result = await _controller.GetTodayUpdates(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<TodayUpdatesResponse>(ok.Value);
        Assert.Empty(body.Updates);
    }
}
