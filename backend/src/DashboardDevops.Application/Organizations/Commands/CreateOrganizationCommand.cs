using DashboardDevops.Application.Common.DTOs;
using DashboardDevops.Domain.Entities;
using DashboardDevops.Domain.Interfaces;
using MediatR;

namespace DashboardDevops.Application.Organizations.Commands;

public record CreateOrganizationCommand(string Name, string Url, string PatToken, string? Description)
    : IRequest<OrganizationDto>;

public record UpdateOrganizationCommand(Guid Id, string? Name, string? Url, string? PatToken, string? Description, bool? IsActive)
    : IRequest<OrganizationDto?>;

public record DeleteOrganizationCommand(Guid Id) : IRequest<bool>;

public class CreateOrganizationCommandHandler(IOrganizationRepository repository)
    : IRequestHandler<CreateOrganizationCommand, OrganizationDto>
{
    public async Task<OrganizationDto> Handle(CreateOrganizationCommand request, CancellationToken ct)
    {
        var org = new Organization
        {
            Name = request.Name,
            Url = request.Url.TrimEnd('/'),
            PatToken = request.PatToken,
            Description = request.Description
        };

        var created = await repository.AddAsync(org, ct);
        return new OrganizationDto(created.Id, created.Name, created.Url, created.IsActive, created.Description, created.CreatedAt);
    }
}

public class UpdateOrganizationCommandHandler(IOrganizationRepository repository)
    : IRequestHandler<UpdateOrganizationCommand, OrganizationDto?>
{
    public async Task<OrganizationDto?> Handle(UpdateOrganizationCommand request, CancellationToken ct)
    {
        var org = await repository.GetByIdAsync(request.Id, ct);
        if (org is null) return null;

        if (request.Name is not null) org.Name = request.Name;
        if (request.Url is not null) org.Url = request.Url.TrimEnd('/');
        if (request.PatToken is not null) org.PatToken = request.PatToken;
        if (request.Description is not null) org.Description = request.Description;
        if (request.IsActive.HasValue) org.IsActive = request.IsActive.Value;
        org.UpdatedAt = DateTime.UtcNow;

        var updated = await repository.UpdateAsync(org, ct);
        return new OrganizationDto(updated.Id, updated.Name, updated.Url, updated.IsActive, updated.Description, updated.CreatedAt);
    }
}

public class DeleteOrganizationCommandHandler(IOrganizationRepository repository)
    : IRequestHandler<DeleteOrganizationCommand, bool>
{
    public async Task<bool> Handle(DeleteOrganizationCommand request, CancellationToken ct)
    {
        var exists = await repository.GetByIdAsync(request.Id, ct);
        if (exists is null) return false;
        await repository.DeleteAsync(request.Id, ct);
        return true;
    }
}
