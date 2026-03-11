FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY DashboardDevops.sln .
COPY src/DashboardDevops.Domain/DashboardDevops.Domain.csproj src/DashboardDevops.Domain/
COPY src/DashboardDevops.Application/DashboardDevops.Application.csproj src/DashboardDevops.Application/
COPY src/DashboardDevops.Infrastructure/DashboardDevops.Infrastructure.csproj src/DashboardDevops.Infrastructure/
COPY src/DashboardDevops.Api/DashboardDevops.Api.csproj src/DashboardDevops.Api/

RUN dotnet restore

COPY . .

RUN dotnet publish src/DashboardDevops.Api/DashboardDevops.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["dotnet", "DashboardDevops.Api.dll"]
