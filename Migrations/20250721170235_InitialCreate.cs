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
                    BroadcasterId = table.Column<int>(type: "int", nullable: true)
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
                table: "Rooms",
                columns: new[] { "Id", "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[,]
                {
                    { 11, null, new DateTime(2025, 7, 21, 6, 2, 34, 562, DateTimeKind.Utc).AddTicks(2435), null, "Room 11", 0 },
                    { 12, null, new DateTime(2025, 7, 21, 5, 2, 34, 562, DateTimeKind.Utc).AddTicks(2437), null, "Room 12", 0 },
                    { 13, null, new DateTime(2025, 7, 21, 4, 2, 34, 562, DateTimeKind.Utc).AddTicks(2438), null, "Room 13", 0 },
                    { 14, null, new DateTime(2025, 7, 21, 3, 2, 34, 562, DateTimeKind.Utc).AddTicks(2439), null, "Room 14", 0 },
                    { 15, null, new DateTime(2025, 7, 21, 2, 2, 34, 562, DateTimeKind.Utc).AddTicks(2440), null, "Room 15", 0 },
                    { 16, null, new DateTime(2025, 7, 21, 1, 2, 34, 562, DateTimeKind.Utc).AddTicks(2442), null, "Room 16", 0 },
                    { 17, null, new DateTime(2025, 7, 21, 0, 2, 34, 562, DateTimeKind.Utc).AddTicks(2443), null, "Room 17", 0 },
                    { 18, null, new DateTime(2025, 7, 20, 23, 2, 34, 562, DateTimeKind.Utc).AddTicks(2445), null, "Room 18", 0 },
                    { 19, null, new DateTime(2025, 7, 20, 22, 2, 34, 562, DateTimeKind.Utc).AddTicks(2446), null, "Room 19", 0 },
                    { 20, null, new DateTime(2025, 7, 20, 21, 2, 34, 562, DateTimeKind.Utc).AddTicks(2447), null, "Room 20", 0 }
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "PasswordHash", "UserApiKey", "Username" },
                values: new object[,]
                {
                    { 1, "AQAAAAIAAYagAAAAEJ2glyJVslV2nenWZpfZlc63iwhoGeKosm5cW2sQ83bH84BZsWwbcTfCivW+/9YaoQ==", "testUserApiKey", "testuser" },
                    { 2, "AQAAAAIAAYagAAAAEOPVRl8UOVWCNwTX3VI+Wa5LqMQmn1PpmqF+JgczCXrfaZWkomlPxgOwroM1n3v+RA==", "anotherUserApiKey123", "anotheruser" }
                });

            migrationBuilder.InsertData(
                table: "Rooms",
                columns: new[] { "Id", "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[,]
                {
                    { 1, 1, new DateTime(2025, 7, 21, 16, 2, 34, 562, DateTimeKind.Utc).AddTicks(2394), null, "Room 1", 1 },
                    { 2, 1, new DateTime(2025, 7, 21, 15, 2, 34, 562, DateTimeKind.Utc).AddTicks(2402), null, "Room 2", 1 },
                    { 3, 1, new DateTime(2025, 7, 21, 14, 2, 34, 562, DateTimeKind.Utc).AddTicks(2404), null, "Room 3", 1 },
                    { 4, 1, new DateTime(2025, 7, 21, 13, 2, 34, 562, DateTimeKind.Utc).AddTicks(2405), null, "Room 4", 1 },
                    { 5, 1, new DateTime(2025, 7, 21, 12, 2, 34, 562, DateTimeKind.Utc).AddTicks(2406), null, "Room 5", 1 },
                    { 6, 1, new DateTime(2025, 7, 21, 11, 2, 34, 562, DateTimeKind.Utc).AddTicks(2424), new DateTime(2025, 7, 21, 14, 2, 34, 562, DateTimeKind.Utc).AddTicks(2419), "Room 6", 3 },
                    { 7, 1, new DateTime(2025, 7, 21, 10, 2, 34, 562, DateTimeKind.Utc).AddTicks(2425), new DateTime(2025, 7, 21, 13, 32, 34, 562, DateTimeKind.Utc).AddTicks(2424), "Room 7", 3 },
                    { 8, 1, new DateTime(2025, 7, 21, 9, 2, 34, 562, DateTimeKind.Utc).AddTicks(2427), new DateTime(2025, 7, 21, 13, 2, 34, 562, DateTimeKind.Utc).AddTicks(2426), "Room 8", 3 },
                    { 9, 1, new DateTime(2025, 7, 21, 8, 2, 34, 562, DateTimeKind.Utc).AddTicks(2429), new DateTime(2025, 7, 21, 12, 32, 34, 562, DateTimeKind.Utc).AddTicks(2427), "Room 9", 3 },
                    { 10, 1, new DateTime(2025, 7, 21, 7, 2, 34, 562, DateTimeKind.Utc).AddTicks(2434), new DateTime(2025, 7, 21, 12, 2, 34, 562, DateTimeKind.Utc).AddTicks(2430), "Room 10", 3 }
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
