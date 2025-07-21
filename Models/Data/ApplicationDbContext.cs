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
                    Username = "testuser",
                    PasswordHash = hasher.HashPassword(null, "password"),
                    UserApiKey = "testUserApiKey"
                },
                new User
                {
                    Id = 2,
                    Username = "anotheruser",
                    PasswordHash = hasher.HashPassword(null, "anotherpassword"),
                    UserApiKey = "anotherUserApiKey123"
                }
            );

            var roomsToSeed = new List<Room>();
            for (int i = 1; i <= 20; i++)
            {
                RoomStatus status;
                int? broadcasterId = null;
                DateTime? endedAt = null;

                if (i <= 5)
                {
                    status = RoomStatus.Broadcasting;
                    broadcasterId = 1;  
                }
                else if (i <= 10)
                {
                    status = RoomStatus.Ended;
                    broadcasterId = 1;  
                    endedAt = DateTime.UtcNow.AddHours(-i / 2.0);
                }
                else
                {
                    status = RoomStatus.Open;
                }
                roomsToSeed.Add(new Room
                {
                    Id = i,
                    Name = $"Room {i}",
                    Status = status,
                    CreatedAt = DateTime.UtcNow.AddHours(-i),
                    EndedAt = endedAt,
                    BroadcasterId = broadcasterId
                });
            }
            modelBuilder.Entity<Room>().HasData(roomsToSeed);


            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.User)
                .WithMany(u => u.ChatMessages)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Room>()
                .HasOne(r => r.Broadcaster)
                .WithMany(u => u.Rooms)
                .HasForeignKey(r => r.BroadcasterId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}