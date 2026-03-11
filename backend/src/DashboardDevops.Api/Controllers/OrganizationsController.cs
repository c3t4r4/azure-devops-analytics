using DashboardDevops.Application.Common.DTOs;
using DashboardDevops.Application.Organizations.Commands;
using DashboardDevops.Application.Organizations.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrganizationsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrganizationDto>>> GetAll(CancellationToken ct)
    {
        var result = await mediator.Send(new GetOrganizationsQuery(), ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrganizationDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetOrganizationByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<OrganizationDto>> Create([FromBody] CreateOrganizationRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(
            new CreateOrganizationCommand(request.Name, request.Url, request.PatToken, request.Description), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<OrganizationDto>> Update(Guid id, [FromBody] UpdateOrganizationRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(
            new UpdateOrganizationCommand(id, request.Name, request.Url, request.PatToken, request.Description, request.IsActive), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await mediator.Send(new DeleteOrganizationCommand(id), ct);
        return deleted ? NoContent() : NotFound();
    }
}
