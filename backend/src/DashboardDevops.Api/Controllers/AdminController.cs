using System.Security.Claims;
using System.Text.RegularExpressions;
using DashboardDevops.Domain.Entities;
using DashboardDevops.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Owner,Admin")]
public class AdminController(IUserRepository userRepo, IPasswordHasher passwordHasher, IConfiguration config) : ControllerBase
{
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private readonly string _ownerEmail = config["Auth:DefaultAdminEmail"] ?? "admin@configuracao.com.br";

    private (Guid? UserId, string Role) GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "User";
        return (Guid.TryParse(userId, out var id) ? id : null, role);
    }

    private bool IsOwner(User u) => u.Role == "Owner" || u.Email.Equals(_ownerEmail, StringComparison.OrdinalIgnoreCase);

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers(CancellationToken ct)
    {
        var users = await userRepo.GetAllAsync(ct);
        return Ok(users.Select(u => new
        {
            id = u.Id,
            email = u.Email,
            displayName = u.DisplayName,
            role = u.Role,
            isActive = u.IsActive,
            failedLoginAttempts = u.FailedLoginAttempts,
            createdAt = u.CreatedAt,
            lastLoginAt = u.LastLoginAt
        }));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var (_, role) = GetCurrentUser();
        var requestedRole = (request.Role ?? "User").Trim();

        if (requestedRole == "Admin" && role != "Owner")
            return Forbid();

        if (requestedRole == "Owner")
            return BadRequest(new { message = "Não é possível criar usuários com perfil Owner." });

        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "E-mail é obrigatório." });

        if (!EmailRegex.IsMatch(email))
            return BadRequest(new { message = "Informe um e-mail válido." });

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return BadRequest(new { message = "A senha deve ter no mínimo 6 caracteres." });

        if (string.IsNullOrWhiteSpace(request.DisplayName))
            return BadRequest(new { message = "Nome de exibição é obrigatório." });

        var existing = await userRepo.GetByEmailAsync(email, ct);
        if (existing is not null)
            return Conflict(new { message = "Já existe um usuário com este e-mail." });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            Role = requestedRole,
            IsActive = true,
            PasswordHash = passwordHasher.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow
        };

        await userRepo.AddAsync(user);
        return StatusCode(201, new
        {
            id = user.Id,
            email = user.Email,
            displayName = user.DisplayName,
            role = user.Role,
            message = "Usuário cadastrado com sucesso."
        });
    }

    [HttpPatch("users/{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateUser(Guid id, CancellationToken ct)
    {
        var (_, currentRole) = GetCurrentUser();
        var target = await userRepo.GetByIdAsync(id, ct);
        if (target is null)
            return NotFound();

        if (IsOwner(target))
            return BadRequest(new { message = "O usuário Owner não pode ser inativado." });

        if (target.Role == "Admin" && currentRole != "Owner")
            return Forbid();

        target.IsActive = false;
        await userRepo.UpdateAsync(target, ct);
        return Ok(new { message = "Usuário inativado com sucesso." });
    }

    [HttpPatch("users/{id:guid}/activate")]
    public async Task<IActionResult> ActivateUser(Guid id, CancellationToken ct)
    {
        var (_, currentRole) = GetCurrentUser();
        var target = await userRepo.GetByIdAsync(id, ct);
        if (target is null)
            return NotFound();

        if (IsOwner(target))
            return BadRequest(new { message = "O usuário Owner não pode ser alterado." });

        if (target.Role == "Admin" && currentRole != "Owner")
            return Forbid();

        target.IsActive = true;
        target.FailedLoginAttempts = 0;
        await userRepo.UpdateAsync(target, ct);
        return Ok(new { message = "Usuário ativado com sucesso." });
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var (_, currentRole) = GetCurrentUser();
        var target = await userRepo.GetByIdAsync(id, ct);
        if (target is null)
            return NotFound();

        if (IsOwner(target))
            return BadRequest(new { message = "O usuário Owner não pode ser removido." });

        if (target.Role == "Admin" && currentRole != "Owner")
            return Forbid();

        await userRepo.DeleteAsync(target, ct);
        return Ok(new { message = "Usuário removido com sucesso." });
    }

    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, CancellationToken ct)
    {
        var (_, currentRole) = GetCurrentUser();
        var target = await userRepo.GetByIdAsync(id, ct);
        if (target is null)
            return NotFound();

        if (IsOwner(target))
            return BadRequest(new { message = "A senha do Owner não pode ser alterada por este endpoint." });

        if (target.Role == "Admin" && currentRole != "Owner")
            return Forbid();

        var newPassword = GenerateRandomPassword(12);
        target.PasswordHash = passwordHasher.HashPassword(newPassword);
        target.FailedLoginAttempts = 0;
        target.IsActive = true;
        await userRepo.UpdateAsync(target, ct);

        return Ok(new
        {
            message = "Senha resetada com sucesso. Informe a nova senha ao usuário.",
            newPassword
        });
    }

    private static string GenerateRandomPassword(int length)
    {
        const string chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
        var random = new Random();
        return new string(Enumerable.Range(0, length).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }
}

public record CreateUserRequest(string Email, string Password, string DisplayName, string? Role);
