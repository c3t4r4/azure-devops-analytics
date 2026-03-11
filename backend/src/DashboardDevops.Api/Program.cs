using System.Text;
using DashboardDevops.Api.Middleware;
using DashboardDevops.Application;
using DashboardDevops.Domain.Entities;
using DashboardDevops.Infrastructure;
using DashboardDevops.Infrastructure.Persistence;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Carrega .env da raiz do repositório para desenvolvimento local (chave de criptografia, JWT, etc.)
var candidates = new[]
{
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..", ".env")),
    Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", ".env"))
};
foreach (var p in candidates)
{
    if (File.Exists(p))
    {
        Env.Load(p);
        break;
    }
}

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add(new AuthorizeFilter(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build()));
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "DashboardDevops-SecretKey-Min32Chars!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "DashboardDevops",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "DashboardDevops",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Azure DevOps Dashboard API", Version = "v1" });
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200", "http://frontend:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("X-Dashboard-Hash");
    });
});

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!)
    .AddRedis(builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379");

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Dashboard DevOps API v1"));
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
    try
    {
        await db.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully.");

        var userRepo = scope.ServiceProvider.GetRequiredService<DashboardDevops.Domain.Interfaces.IUserRepository>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<DashboardDevops.Domain.Interfaces.IPasswordHasher>();
        var defaultEmail = builder.Configuration["Auth:DefaultAdminEmail"] ?? "admin@configuracao.com.br";
        var defaultPassword = builder.Configuration["Auth:DefaultPassword"] ?? "admin123";

        if (!await userRepo.AnyAsync())
        {
            var admin = new User
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
            logger.LogInformation("Usuário Owner criado. Use '{Email}' / '{Password}' para login.", defaultEmail, defaultPassword);
        }
        else
        {
            var existingOwner = await userRepo.GetByEmailAsync(defaultEmail);
            if (existingOwner is not null && existingOwner.Role != "Owner")
            {
                existingOwner.Role = "Owner";
                existingOwner.IsActive = true;
                await userRepo.UpdateAsync(existingOwner);
                logger.LogInformation("Usuário padrão atualizado para Owner.");
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Could not apply database migrations. " +
            "Make sure PostgreSQL is running and the connection string is correct. " +
            "Run with Docker Compose for a full environment: docker compose -f docker-compose.dev.yml up");
    }
}

app.Run();
