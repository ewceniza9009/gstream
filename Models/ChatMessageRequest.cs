using System.ComponentModel.DataAnnotations;

namespace gstream.Models
{
    public class ChatMessageRequest
    {
        [Required]
        [MaxLength(500)]
        public string Content { get; set; } = string.Empty;
    }
}