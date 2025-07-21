namespace gstream.Models
{
    public class RoomDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? BroadcasterUsername { get; set; }
    }
}