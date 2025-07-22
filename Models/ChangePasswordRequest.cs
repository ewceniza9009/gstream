using System.ComponentModel.DataAnnotations;

namespace gstream.Models
{
    public class ChangePasswordRequest
    {
        [Required]
        public string OldPassword { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }
}