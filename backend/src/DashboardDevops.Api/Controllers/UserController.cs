using System.Security.Claims;
using DashboardDevops.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserController(IUserRepository userRepo, IPasswordHasher passwordHasher) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var id))
            return Unauthorized();

        var user = await userRepo.GetByIdAsync(id, ct);
        if (user is null)
            return NotFound();

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            displayName = user.DisplayName,
            role = user.Role,
            isActive = user.IsActive
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var id))
            return Unauthorized();

        var user = await userRepo.GetByIdAsync(id, ct);
        if (user is null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(request.DisplayName))
            user.DisplayName = request.DisplayName.Trim();

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (request.NewPassword.Length < 6)
                return BadRequest(new { message = "A nova senha deve ter no mínimo 6 caracteres." });

            if (!string.IsNullOrWhiteSpace(request.CurrentPassword) &&
                !passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Senha atual incorreta." });

            user.PasswordHash = passwordHasher.HashPassword(request.NewPassword);
        }

        await userRepo.UpdateAsync(user, ct);
        return Ok(new { message = "Perfil atualizado com sucesso." });
    }
}

public record UpdateProfileRequest(string? DisplayName, string? CurrentPassword, string? NewPassword);
