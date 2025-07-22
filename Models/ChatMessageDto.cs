namespace gstream.Models
{
    public class ChatMessageDto
    {
        public string Username { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}