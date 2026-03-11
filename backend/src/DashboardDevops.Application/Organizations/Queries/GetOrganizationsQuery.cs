using DashboardDevops.Application.Common.DTOs;
using DashboardDevops.Domain.Interfaces;
using MediatR;

namespace DashboardDevops.Application.Organizations.Queries;

public record GetOrganizationsQuery : IRequest<IEnumerable<OrganizationDto>>;

public record GetOrganizationByIdQuery(Guid Id) : IRequest<OrganizationDto?>;

public class GetOrganizationsQueryHandler(IOrganizationRepository repository)
    : IRequestHandler<GetOrganizationsQuery, IEnumerable<OrganizationDto>>
{
    public async Task<IEnumerable<OrganizationDto>> Handle(GetOrganizationsQuery request, CancellationToken ct)
    {
        var orgs = await repository.GetAllAsync(ct);
        return orgs.Select(o => new OrganizationDto(o.Id, o.Name, o.Url, o.IsActive, o.Description, o.CreatedAt));
    }
}

public class GetOrganizationByIdQueryHandler(IOrganizationRepository repository)
    : IRequestHandler<GetOrganizationByIdQuery, OrganizationDto?>
{
    public async Task<OrganizationDto?> Handle(GetOrganizationByIdQuery request, CancellationToken ct)
    {
        var org = await repository.GetByIdAsync(request.Id, ct);
        if (org is null) return null;
        return new OrganizationDto(org.Id, org.Name, org.Url, org.IsActive, org.Description, org.CreatedAt);
    }
}
