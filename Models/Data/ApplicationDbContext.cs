using gstream.Models.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace gstream.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(e => e.Username).IsUnique();
                entity.Property(e => e.Role).HasConversion<string>();
                entity.HasIndex(e => e.UserApiKey).IsUnique();
            });

            modelBuilder.Entity<Room>(entity =>
            {
                entity.HasIndex(e => e.Name).IsUnique();
            });

            var hasher = new PasswordHasher<User>(
                new OptionsWrapper<PasswordHasherOptions>(
                    new PasswordHasherOptions()
                    {
                        CompatibilityMode = PasswordHasherCompatibilityMode.IdentityV3
                    })
            );

            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Username = "admin",
                    PasswordHash = hasher.HashPassword(null, "adminpassword"),
                    UserApiKey = "adminKey_DO_NOT_USE_IN_PROD",
                    Role = UserRole.Admin,
                    IsBlocked = false
                },
                new User
                {
                    Id = 2,
                    Username = "broadcaster1",
                    PasswordHash = hasher.HashPassword(null, "password"),
                    UserApiKey = "broadcaster1ApiKey",
                    Role = UserRole.Broadcaster,
                    IsBlocked = false
                },
                new User
                {
                    Id = 3,
                    Username = "consumer1",
                    PasswordHash = hasher.HashPassword(null, "password"),
                    UserApiKey = "consumer1ApiKey",
                    Role = UserRole.Consumer,
                    IsBlocked = false
                }
            );

            var roomsToSeed = new List<Room>();
            for (int i = 1; i <= 20; i++)
            {
                roomsToSeed.Add(new Room
                {
                    Id = i,
                    Name = $"Public Room {i}",
                    Status = RoomStatus.Open,
                    CreatedAt = DateTime.UtcNow.AddHours(-i)
                });
            }
            modelBuilder.Entity<Room>().HasData(roomsToSeed);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.User)
                .WithMany(u => u.ChatMessages)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);        

            modelBuilder.Entity<Room>()
                .HasOne(r => r.Broadcaster)
                .WithMany(u => u.Rooms)
                .HasForeignKey(r => r.BroadcasterId)
                .OnDelete(DeleteBehavior.SetNull);         
        }
    }
}