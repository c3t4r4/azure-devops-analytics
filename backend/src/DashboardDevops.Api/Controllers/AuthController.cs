using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using DashboardDevops.Domain.Entities;
using DashboardDevops.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace DashboardDevops.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IUserRepository userRepo, IPasswordHasher passwordHasher, IConfiguration config, IWebHostEnvironment env) : ControllerBase
{
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "E-mail e senha são obrigatórios." });

        if (!EmailRegex.IsMatch(email))
            return BadRequest(new { message = "Informe um e-mail válido." });

        var user = await userRepo.GetByEmailAsync(email, ct);
        if (user is null)
            return Unauthorized(new { message = "E-mail ou senha inválidos." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Usuário desativado. Entre em contato com o administrador." });

        if (!passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            var deactivated = await userRepo.IncrementFailedLoginAsync(email, 5, ct);
            return Unauthorized(new
            {
                message = deactivated
                    ? "Muitas tentativas incorretas. Sua conta foi desativada por segurança. Entre em contato com o administrador."
                    : "E-mail ou senha inválidos."
            });
        }

        await userRepo.UpdateLastLoginAsync(user.Id, ct);
        var token = GenerateJwt(user);
        return Ok(new LoginResponse(token, user.Email, user.DisplayName ?? user.Email, user.Role, DateTime.UtcNow.AddHours(24)));
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() => Ok(new { message = "Logout realizado." });

    /// <summary>
    /// Cria ou reseta o usuário admin com senha padrão. Apenas em Development.
    /// </summary>
    [HttpPost("seed")]
    [AllowAnonymous]
    public async Task<IActionResult> SeedAdmin(CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var defaultEmail = config["Auth:DefaultAdminEmail"] ?? "admin@configuracao.com.br";
        var defaultPassword = config["Auth:DefaultPassword"] ?? "admin123";
        var admin = await userRepo.GetByEmailAsync(defaultEmail, ct);

        if (admin is null)
        {
            admin = new User
            {
                Id = Guid.NewGuid(),
                Email = defaultEmail,
                DisplayName = "Administrador",
                Role = "Owner",
                IsActive = true,
                PasswordHash = passwordHasher.HashPassword(defaultPassword),
                CreatedAt = DateTime.UtcNow
            };
            await userRepo.AddAsync(admin);
        }
        else
        {
            admin.PasswordHash = passwordHasher.HashPassword(defaultPassword);
            admin.Role = "Owner";
            admin.IsActive = true;
            await userRepo.UpdateAsync(admin, ct);
        }

        return Ok(new { message = $"Admin criado/atualizado. Use {defaultEmail} / {defaultPassword}" });
    }

    private string GenerateJwt(User user)
    {
        var key = config["Jwt:Key"] ?? "DashboardDevops-SecretKey-Min32Chars!!";
        var issuer = config["Jwt:Issuer"] ?? "DashboardDevops";
        var audience = config["Jwt:Audience"] ?? "DashboardDevops";

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Email),
            new Claim("displayName", user.DisplayName ?? user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record LoginRequest(string Email, string Password);

public record LoginResponse(string Token, string Email, string DisplayName, string Role, DateTime ExpiresAt);
