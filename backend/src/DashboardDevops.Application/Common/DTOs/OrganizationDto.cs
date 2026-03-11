namespace DashboardDevops.Application.Common.DTOs;

public record OrganizationDto(
    Guid Id,
    string Name,
    string Url,
    bool IsActive,
    string? Description,
    DateTime CreatedAt
);

public record CreateOrganizationRequest(
    string Name,
    string Url,
    string PatToken,
    string? Description
);

public record UpdateOrganizationRequest(
    string? Name,
    string? Url,
    string? PatToken,
    string? Description,
    bool? IsActive
);
