using System.ComponentModel.DataAnnotations;

namespace gstream.Models.Data
{
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

        public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
        public virtual ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
    }
}