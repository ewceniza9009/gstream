using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace gstream.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserApiKey = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Rooms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BroadcasterId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rooms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Rooms_Users_BroadcasterId",
                        column: x => x.BroadcasterId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChatMessages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Content = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RoomId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatMessages_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChatMessages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "PasswordHash", "UserApiKey", "Username" },
                values: new object[,]
                {
                    { 1, "password", "testUserApiKey", "testuser" },
                    { 2, "anotherpassword", "anotherUserApiKey123", "anotheruser" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_RoomId",
                table: "ChatMessages",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_UserId",
                table: "ChatMessages",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_BroadcasterId",
                table: "Rooms",
                column: "BroadcasterId");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_Name",
                table: "Rooms",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_UserApiKey",
                table: "Users",
                column: "UserApiKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatMessages");

            migrationBuilder.DropTable(
                name: "Rooms");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
