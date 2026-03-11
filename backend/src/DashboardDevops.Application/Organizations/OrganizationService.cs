using DashboardDevops.Application.Common.DTOs;
using DashboardDevops.Domain.Entities;
using DashboardDevops.Domain.Interfaces;

namespace DashboardDevops.Application.Organizations;

public class OrganizationService(
    IOrganizationRepository repository,
    IOrgRefreshTrigger refreshTrigger)
    : IOrganizationService
{
    public async Task<IEnumerable<OrganizationDto>> GetAllAsync(CancellationToken ct = default)
    {
        var orgs = await repository.GetAllAsync(ct);
        return orgs.Select(o => new OrganizationDto(o.Id, o.Name, o.Url, o.IsActive, o.Description, o.CreatedAt));
    }

    public async Task<OrganizationDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var org = await repository.GetByIdAsync(id, ct);
        if (org is null) return null;
        return new OrganizationDto(org.Id, org.Name, org.Url, org.IsActive, org.Description, org.CreatedAt);
    }

    public async Task<OrganizationDto> CreateAsync(string name, string url, string patToken, string? description, CancellationToken ct = default)
    {
        var org = new Organization
        {
            Name = name,
            Url = url.TrimEnd('/'),
            PatToken = patToken,
            Description = description
        };
        var created = await repository.AddAsync(org, ct);
        _ = Task.Run(() => refreshTrigger.TriggerRefreshForOrgAsync(created.Name, created.PatToken, CancellationToken.None));
        return new OrganizationDto(created.Id, created.Name, created.Url, created.IsActive, created.Description, created.CreatedAt);
    }

    public async Task<OrganizationDto?> UpdateAsync(Guid id, string? name, string? url, string? patToken, string? description, bool? isActive, CancellationToken ct = default)
    {
        var org = await repository.GetByIdAsync(id, ct);
        if (org is null) return null;

        if (name is not null) org.Name = name;
        if (url is not null) org.Url = url.TrimEnd('/');
        if (patToken is not null) org.PatToken = patToken;
        if (description is not null) org.Description = description;
        if (isActive.HasValue) org.IsActive = isActive.Value;
        org.UpdatedAt = DateTime.UtcNow;

        var updated = await repository.UpdateAsync(org, ct);
        return new OrganizationDto(updated.Id, updated.Name, updated.Url, updated.IsActive, updated.Description, updated.CreatedAt);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var exists = await repository.GetByIdAsync(id, ct);
        if (exists is null) return false;
        await repository.DeleteAsync(id, ct);
        return true;
    }
}
