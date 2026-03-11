using DashboardDevops.Application.Common.DTOs;
using DashboardDevops.Application.Organizations;
using DashboardDevops.Domain.Entities;
using DashboardDevops.Domain.Interfaces;
using Moq;
using Xunit;

namespace DashboardDevops.Tests.Application;

public class OrganizationServiceTests
{
    private readonly Mock<IOrganizationRepository> _repository;
    private readonly Mock<IOrgRefreshTrigger> _refreshTrigger;
    private readonly OrganizationService _sut;

    public OrganizationServiceTests()
    {
        _repository = new Mock<IOrganizationRepository>();
        _refreshTrigger = new Mock<IOrgRefreshTrigger>();
        _sut = new OrganizationService(_repository.Object, _refreshTrigger.Object);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsMappedDtos()
    {
        var orgs = new List<Organization>
        {
            new() { Id = Guid.NewGuid(), Name = "org1", Url = "https://dev.azure.com/org1", IsActive = true, CreatedAt = DateTime.UtcNow }
        };
        _repository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(orgs);

        var result = (await _sut.GetAllAsync()).ToList();

        Assert.Single(result);
        Assert.Equal(orgs[0].Id, result[0].Id);
        Assert.Equal("org1", result[0].Name);
        Assert.Equal("https://dev.azure.com/org1", result[0].Url);
        Assert.True(result[0].IsActive);
    }

    [Fact]
    public async Task GetByIdAsync_WhenExists_ReturnsDto()
    {
        var id = Guid.NewGuid();
        var org = new Organization { Id = id, Name = "org1", Url = "https://dev.azure.com/org1", IsActive = true, CreatedAt = DateTime.UtcNow };
        _repository.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(org);

        var result = await _sut.GetByIdAsync(id);

        Assert.NotNull(result);
        Assert.Equal(id, result.Id);
        Assert.Equal("org1", result.Name);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotExists_ReturnsNull()
    {
        _repository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Organization?)null);

        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAsync_TrimsTrailingSlashFromUrl_AndReturnsDto()
    {
        var created = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "myorg",
            Url = "https://dev.azure.com/myorg",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _repository.Setup(r => r.AddAsync(It.IsAny<Organization>(), It.IsAny<CancellationToken>())).ReturnsAsync(created);
        _refreshTrigger.Setup(t => t.TriggerRefreshForOrgAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await _sut.CreateAsync("myorg", "https://dev.azure.com/myorg/", "pat", null);

        Assert.Equal(created.Id, result.Id);
        Assert.Equal("myorg", result.Name);
        _repository.Verify(r => r.AddAsync(It.Is<Organization>(o => o.Url == "https://dev.azure.com/myorg"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WhenExists_UpdatesAndReturnsDto()
    {
        var id = Guid.NewGuid();
        var org = new Organization { Id = id, Name = "old", Url = "https://dev.azure.com/old", IsActive = true, CreatedAt = DateTime.UtcNow };
        _repository.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(org);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Organization>(), It.IsAny<CancellationToken>())).ReturnsAsync((Organization o, CancellationToken _) => o);

        var result = await _sut.UpdateAsync(id, "newName", null, null, null, null);

        Assert.NotNull(result);
        Assert.Equal("newName", result.Name);
        _repository.Verify(r => r.UpdateAsync(It.Is<Organization>(o => o.Name == "newName"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WhenNotExists_ReturnsNull()
    {
        _repository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Organization?)null);

        var result = await _sut.UpdateAsync(Guid.NewGuid(), "x", null, null, null, null);

        Assert.Null(result);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Organization>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_WhenExists_ReturnsTrue()
    {
        var id = Guid.NewGuid();
        _repository.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(new Organization { Id = id });
        _repository.Setup(r => r.DeleteAsync(id, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await _sut.DeleteAsync(id);

        Assert.True(result);
        _repository.Verify(r => r.DeleteAsync(id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_WhenNotExists_ReturnsFalse()
    {
        _repository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Organization?)null);

        var result = await _sut.DeleteAsync(Guid.NewGuid());

        Assert.False(result);
        _repository.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
