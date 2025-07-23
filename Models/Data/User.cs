using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace gstream.Models.Data
{
    public enum UserRole
    {
        Consumer,
        Broadcaster,
        Admin
    }

    public class User
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public string UserApiKey { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; } = UserRole.Consumer;

        public bool IsBlocked { get; set; } = false;

        public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
        public virtual ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();

        public string GetInitials()
        {
            if (string.IsNullOrWhiteSpace(Username)) return "?";
            var parts = Username.Split(new[] { ' ', '.', '_' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length > 1)
            {
                return (parts[0][0].ToString() + parts[^1][0].ToString()).ToUpper();
            }
            return Username.Length > 1 ? Username.Substring(0, 2).ToUpper() : Username.ToUpper();
        }
    }
}