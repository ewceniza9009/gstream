using System.ComponentModel.DataAnnotations;

namespace gstream.Models
{
    public class RoomRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }
}