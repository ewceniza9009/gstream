using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace gstream.Models.Data
{
    public class ChatMessage
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Content { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public int RoomId { get; set; }
        [ForeignKey("RoomId")]
        public virtual Room? Room { get; set; }

        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}