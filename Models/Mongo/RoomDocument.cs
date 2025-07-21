using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace gstream.Models.Mongo
{
    public class ChatMessageDocument
    {
        public ObjectId UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime Timestamp { get; set; }
    }

    public class RoomDocument
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("Name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("Status")]
        public string Status { get; set; } = "Ended";

        [BsonElement("BroadcasterId")]
        public ObjectId BroadcasterId { get; set; }

        [BsonElement("CreatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; }

        [BsonElement("EndedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? EndedAt { get; set; }

        [BsonElement("ChatMessages")]
        public List<ChatMessageDocument> ChatMessages { get; set; } = new List<ChatMessageDocument>();
    }
}