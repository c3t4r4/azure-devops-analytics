using DashboardDevops.Application.Common.DTOs;

namespace DashboardDevops.Application.Organizations;

public interface IOrganizationService
{
    Task<IEnumerable<OrganizationDto>> GetAllAsync(CancellationToken ct = default);
    Task<OrganizationDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<OrganizationDto> CreateAsync(string name, string url, string patToken, string? description, CancellationToken ct = default);
    Task<OrganizationDto?> UpdateAsync(Guid id, string? name, string? url, string? patToken, string? description, bool? isActive, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
