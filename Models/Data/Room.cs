using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace gstream.Models.Data
{
    public enum RoomStatus
    {
        Open,
        Broadcasting,
        Reserved,
        Ended
    }

    public class Room
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public RoomStatus Status { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? EndedAt { get; set; }

        public int? BroadcasterId { get; set; }   
        [ForeignKey("BroadcasterId")]
        public virtual User? Broadcaster { get; set; }

        public virtual ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
    }
}