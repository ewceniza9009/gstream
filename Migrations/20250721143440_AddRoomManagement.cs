using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace gstream.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "BroadcasterId",
                table: "Rooms",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.InsertData(
                table: "Rooms",
                columns: new[] { "Id", "BroadcasterId", "CreatedAt", "EndedAt", "Name", "Status" },
                values: new object[,]
                {
                    { 1, 1, new DateTime(2025, 7, 21, 13, 34, 39, 520, DateTimeKind.Utc).AddTicks(6959), null, "Dummy Room 1", 1 },
                    { 2, 1, new DateTime(2025, 7, 21, 12, 34, 39, 520, DateTimeKind.Utc).AddTicks(6967), null, "Dummy Room 2", 1 },
                    { 3, 1, new DateTime(2025, 7, 21, 11, 34, 39, 520, DateTimeKind.Utc).AddTicks(6969), null, "Dummy Room 3", 1 },
                    { 4, 1, new DateTime(2025, 7, 21, 10, 34, 39, 520, DateTimeKind.Utc).AddTicks(6970), null, "Dummy Room 4", 1 },
                    { 5, 1, new DateTime(2025, 7, 21, 9, 34, 39, 520, DateTimeKind.Utc).AddTicks(6972), null, "Dummy Room 5", 1 },
                    { 6, 1, new DateTime(2025, 7, 21, 8, 34, 39, 520, DateTimeKind.Utc).AddTicks(6979), new DateTime(2025, 7, 21, 11, 34, 39, 520, DateTimeKind.Utc).AddTicks(6974), "Dummy Room 6", 3 },
                    { 7, 1, new DateTime(2025, 7, 21, 7, 34, 39, 520, DateTimeKind.Utc).AddTicks(6980), new DateTime(2025, 7, 21, 11, 4, 39, 520, DateTimeKind.Utc).AddTicks(6979), "Dummy Room 7", 3 },
                    { 8, 1, new DateTime(2025, 7, 21, 6, 34, 39, 520, DateTimeKind.Utc).AddTicks(6982), new DateTime(2025, 7, 21, 10, 34, 39, 520, DateTimeKind.Utc).AddTicks(6981), "Dummy Room 8", 3 },
                    { 9, 1, new DateTime(2025, 7, 21, 5, 34, 39, 520, DateTimeKind.Utc).AddTicks(6984), new DateTime(2025, 7, 21, 10, 4, 39, 520, DateTimeKind.Utc).AddTicks(6982), "Dummy Room 9", 3 },
                    { 10, 1, new DateTime(2025, 7, 21, 4, 34, 39, 520, DateTimeKind.Utc).AddTicks(6987), new DateTime(2025, 7, 21, 9, 34, 39, 520, DateTimeKind.Utc).AddTicks(6985), "Dummy Room 10", 3 },
                    { 11, null, new DateTime(2025, 7, 21, 3, 34, 39, 520, DateTimeKind.Utc).AddTicks(6989), null, "Dummy Room 11", 0 },
                    { 12, null, new DateTime(2025, 7, 21, 2, 34, 39, 520, DateTimeKind.Utc).AddTicks(6990), null, "Dummy Room 12", 0 },
                    { 13, null, new DateTime(2025, 7, 21, 1, 34, 39, 520, DateTimeKind.Utc).AddTicks(6992), null, "Dummy Room 13", 0 },
                    { 14, null, new DateTime(2025, 7, 21, 0, 34, 39, 520, DateTimeKind.Utc).AddTicks(6993), null, "Dummy Room 14", 0 },
                    { 15, null, new DateTime(2025, 7, 20, 23, 34, 39, 520, DateTimeKind.Utc).AddTicks(6994), null, "Dummy Room 15", 0 },
                    { 16, null, new DateTime(2025, 7, 20, 22, 34, 39, 520, DateTimeKind.Utc).AddTicks(6996), null, "Dummy Room 16", 0 },
                    { 17, null, new DateTime(2025, 7, 20, 21, 34, 39, 520, DateTimeKind.Utc).AddTicks(6997), null, "Dummy Room 17", 0 },
                    { 18, null, new DateTime(2025, 7, 20, 20, 34, 39, 520, DateTimeKind.Utc).AddTicks(7000), null, "Dummy Room 18", 0 },
                    { 19, null, new DateTime(2025, 7, 20, 19, 34, 39, 520, DateTimeKind.Utc).AddTicks(7001), null, "Dummy Room 19", 0 },
                    { 20, null, new DateTime(2025, 7, 20, 18, 34, 39, 520, DateTimeKind.Utc).AddTicks(7002), null, "Dummy Room 20", 0 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: 20);

            migrationBuilder.AlterColumn<int>(
                name: "BroadcasterId",
                table: "Rooms",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
