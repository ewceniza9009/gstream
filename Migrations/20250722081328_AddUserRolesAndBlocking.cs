using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace gstream.Migrations
{
    /// <inheritdoc />
    public partial class AddUserRolesAndBlocking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatMessages_Users_UserId",
                table: "ChatMessages");

            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Users_BroadcasterId",
                table: "Rooms");

            migrationBuilder.AddColumn<bool>(
                name: "IsBlocked",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 22, 7, 13, 27, 639, DateTimeKind.Utc).AddTicks(5774), "Public Room 1", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 22, 6, 13, 27, 639, DateTimeKind.Utc).AddTicks(5784), "Public Room 2", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 22, 5, 13, 27, 639, DateTimeKind.Utc).AddTicks(5786), "Public Room 3", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 22, 4, 13, 27, 639, DateTimeKind.Utc).AddTicks(5787), "Public Room 4", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 22, 3, 13, 27, 639, DateTimeKind.Utc).AddTicks(5789), "Public Room 5", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 22, 2, 13, 27, 639, DateTimeKind.Utc).AddTicks(5802), null, "Public Room 6", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 22, 1, 13, 27, 639, DateTimeKind.Utc).AddTicks(5804), null, "Public Room 7", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 22, 0, 13, 27, 639, DateTimeKind.Utc).AddTicks(5805), null, "Public Room 8", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 21, 23, 13, 27, 639, DateTimeKind.Utc).AddTicks(5807), null, "Public Room 9", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 10,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { null, new DateTime(2025, 7, 21, 22, 13, 27, 639, DateTimeKind.Utc).AddTicks(5812), null, "Public Room 10", 0 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 21, 13, 27, 639, DateTimeKind.Utc).AddTicks(5835), "Public Room 11" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 20, 13, 27, 639, DateTimeKind.Utc).AddTicks(5913), "Public Room 12" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 13,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 19, 13, 27, 639, DateTimeKind.Utc).AddTicks(5915), "Public Room 13" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 14,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 18, 13, 27, 639, DateTimeKind.Utc).AddTicks(5926), "Public Room 14" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 15,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 17, 13, 27, 639, DateTimeKind.Utc).AddTicks(5937), "Public Room 15" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 16,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 16, 13, 27, 639, DateTimeKind.Utc).AddTicks(5939), "Public Room 16" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 17,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 15, 13, 27, 639, DateTimeKind.Utc).AddTicks(5941), "Public Room 17" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 18,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 14, 13, 27, 639, DateTimeKind.Utc).AddTicks(5944), "Public Room 18" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 19,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 13, 13, 27, 639, DateTimeKind.Utc).AddTicks(5946), "Public Room 19" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 20,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 12, 13, 27, 639, DateTimeKind.Utc).AddTicks(5947), "Public Room 20" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "IsBlocked", "PasswordHash", "Role", "UserApiKey", "Username" },
                values: new object[] { false, "AQAAAAIAAYagAAAAEMTCP0atLB6yG0ibnU7bCj1KOXq7GE/l2UhrizjTVqfgaDKi74rjmihh2Ubiy7bD2Q==", "Admin", "adminApiKey", "admin" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "IsBlocked", "PasswordHash", "Role", "UserApiKey", "Username" },
                values: new object[] { false, "AQAAAAIAAYagAAAAEE+G+Aft9F6kzD+USHb1vdpfrqRzQY5Kp2ibmwAdK+XBRCkWIlH74Eu0LsB89dAAlw==", "Broadcaster", "broadcaster1ApiKey", "broadcaster1" });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "IsBlocked", "PasswordHash", "Role", "UserApiKey", "Username" },
                values: new object[] { 3, false, "AQAAAAIAAYagAAAAEN2GJyPJbnB7vdIkKC7p2bX8LVk68yBwoc6Qg0UJNFuX3Cw4gTIUA3YEo+HSmSXs2g==", "Consumer", "consumer1ApiKey", "consumer1" });

            migrationBuilder.AddForeignKey(
                name: "FK_ChatMessages_Users_UserId",
                table: "ChatMessages",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Users_BroadcasterId",
                table: "Rooms",
                column: "BroadcasterId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatMessages_Users_UserId",
                table: "ChatMessages");

            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Users_BroadcasterId",
                table: "Rooms");

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DropColumn(
                name: "IsBlocked",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Users");

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 16, 2, 34, 562, DateTimeKind.Utc).AddTicks(2394), "Room 1", 1 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 15, 2, 34, 562, DateTimeKind.Utc).AddTicks(2402), "Room 2", 1 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 14, 2, 34, 562, DateTimeKind.Utc).AddTicks(2404), "Room 3", 1 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 13, 2, 34, 562, DateTimeKind.Utc).AddTicks(2405), "Room 4", 1 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "BroadcasterId", "CreatedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 12, 2, 34, 562, DateTimeKind.Utc).AddTicks(2406), "Room 5", 1 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 11, 2, 34, 562, DateTimeKind.Utc).AddTicks(2424), new DateTime(2025, 7, 21, 14, 2, 34, 562, DateTimeKind.Utc).AddTicks(2419), "Room 6", 3 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 10, 2, 34, 562, DateTimeKind.Utc).AddTicks(2425), new DateTime(2025, 7, 21, 13, 32, 34, 562, DateTimeKind.Utc).AddTicks(2424), "Room 7", 3 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 9, 2, 34, 562, DateTimeKind.Utc).AddTicks(2427), new DateTime(2025, 7, 21, 13, 2, 34, 562, DateTimeKind.Utc).AddTicks(2426), "Room 8", 3 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 8, 2, 34, 562, DateTimeKind.Utc).AddTicks(2429), new DateTime(2025, 7, 21, 12, 32, 34, 562, DateTimeKind.Utc).AddTicks(2427), "Room 9", 3 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 10,
                columns: new[] { "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[] { 1, new DateTime(2025, 7, 21, 7, 2, 34, 562, DateTimeKind.Utc).AddTicks(2434), new DateTime(2025, 7, 21, 12, 2, 34, 562, DateTimeKind.Utc).AddTicks(2430), "Room 10", 3 });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 6, 2, 34, 562, DateTimeKind.Utc).AddTicks(2435), "Room 11" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 5, 2, 34, 562, DateTimeKind.Utc).AddTicks(2437), "Room 12" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 13,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 4, 2, 34, 562, DateTimeKind.Utc).AddTicks(2438), "Room 13" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 14,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 3, 2, 34, 562, DateTimeKind.Utc).AddTicks(2439), "Room 14" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 15,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 2, 2, 34, 562, DateTimeKind.Utc).AddTicks(2440), "Room 15" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 16,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 1, 2, 34, 562, DateTimeKind.Utc).AddTicks(2442), "Room 16" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 17,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 21, 0, 2, 34, 562, DateTimeKind.Utc).AddTicks(2443), "Room 17" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 18,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 20, 23, 2, 34, 562, DateTimeKind.Utc).AddTicks(2445), "Room 18" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 19,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 20, 22, 2, 34, 562, DateTimeKind.Utc).AddTicks(2446), "Room 19" });

            migrationBuilder.UpdateData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 20,
                columns: new[] { "CreatedAt", "Name" },
                values: new object[] { new DateTime(2025, 7, 20, 21, 2, 34, 562, DateTimeKind.Utc).AddTicks(2447), "Room 20" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "PasswordHash", "UserApiKey", "Username" },
                values: new object[] { "AQAAAAIAAYagAAAAEJ2glyJVslV2nenWZpfZlc63iwhoGeKosm5cW2sQ83bH84BZsWwbcTfCivW+/9YaoQ==", "testUserApiKey", "testuser" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "PasswordHash", "UserApiKey", "Username" },
                values: new object[] { "AQAAAAIAAYagAAAAEOPVRl8UOVWCNwTX3VI+Wa5LqMQmn1PpmqF+JgczCXrfaZWkomlPxgOwroM1n3v+RA==", "anotherUserApiKey123", "anotheruser" });

            migrationBuilder.AddForeignKey(
                name: "FK_ChatMessages_Users_UserId",
                table: "ChatMessages",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Users_BroadcasterId",
                table: "Rooms",
                column: "BroadcasterId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
