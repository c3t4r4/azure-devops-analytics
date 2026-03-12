using DashboardDevops.Application.Common.DTOs;
using DashboardDevops.Application.Organizations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrganizationsController(IOrganizationService orgService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrganizationDto>>> GetAll(CancellationToken ct)
    {
        var result = await orgService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrganizationDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await orgService.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<OrganizationDto>> Create([FromBody] CreateOrganizationRequest request, CancellationToken ct)
    {
        var result = await orgService.CreateAsync(request.Name, request.Url, request.PatToken, request.Description, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<OrganizationDto>> Update(Guid id, [FromBody] UpdateOrganizationRequest request, CancellationToken ct)
    {
        var result = await orgService.UpdateAsync(id, request.Name, request.Url, request.PatToken, request.Description, request.IsActive, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await orgService.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
