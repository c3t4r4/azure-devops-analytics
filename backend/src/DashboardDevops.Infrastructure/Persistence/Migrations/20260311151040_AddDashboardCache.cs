using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DashboardDevops.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDashboardCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DashboardCaches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CacheKey = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    EncryptedContent = table.Column<string>(type: "text", nullable: false),
                    ContentHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DashboardCaches", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DashboardCaches_CacheKey",
                table: "DashboardCaches",
                column: "CacheKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DashboardCaches");
        }
    }
}
