using gstream.Models.Data;
using Microsoft.EntityFrameworkCore;

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

            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Username = "testuser",
                    PasswordHash = "password",
                    UserApiKey = "testUserApiKey"
                },
                new User
                {
                    Id = 2,
                    Username = "anotheruser",
                    PasswordHash = "anotherpassword",
                    UserApiKey = "anotherUserApiKey123"
                }
            );

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