using Livekit.Server.Sdk.Dotnet;
using Microsoft.Extensions.Configuration;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace gstream.Services
{
    public class LiveKitService
    {
        private readonly string _liveKitHost;
        private readonly string _apiKey;
        private readonly string _apiSecret;
        private readonly string _liveKitApiUrl;
        private readonly RoomServiceClient _roomServiceClient;

        public LiveKitService(IConfiguration configuration)
        {
            var devTunnelUrl = Environment.GetEnvironmentVariable("VS_TUNNEL_URL_7880");
            if (!string.IsNullOrEmpty(devTunnelUrl))
            {
                _liveKitHost = devTunnelUrl.Replace("https://", "wss://");
            }
            else
            {
                _liveKitHost = configuration.GetValue<string>("LiveKit:Url")
                    ?? throw new InvalidOperationException("LiveKit:Url is not configured in appsettings.json.");
            }
            _apiKey = configuration.GetValue<string>("LiveKit:ApiKey")
                ?? throw new InvalidOperationException("LiveKit:ApiKey is not configured in appsettings.json.");
            _apiSecret = configuration.GetValue<string>("LiveKit:ApiSecret")
                ?? throw new InvalidOperationException("LiveKit:ApiSecret is not configured in appsettings.json.");

            var privateUrl = configuration.GetValue<string>("LiveKit:PrivateUrl");
            if (!string.IsNullOrEmpty(privateUrl))
            {
                _liveKitApiUrl = privateUrl;
            }
            else
            {
                Console.WriteLine("[WARNING] LiveKit:PrivateUrl is not configured. The application may not be able to fetch stream stats correctly. Please add it to your appsettings.json.");
                _liveKitApiUrl = _liveKitHost.Replace("wss://", "http://").Replace("ws://", "http://");
            }
            _roomServiceClient = new RoomServiceClient(_liveKitApiUrl, _apiKey, _apiSecret);
        }

        public string GetLiveKitUrl() => _liveKitHost;

        public EgressServiceClient CreateEgressClient()
        {
            return new EgressServiceClient(_liveKitApiUrl, _apiKey, _apiSecret);
        }

        public async Task DeleteRoomAsync(string roomName)
        {
            try
            {
                await _roomServiceClient.DeleteRoom(new() { Room = roomName });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not delete LiveKit room '{roomName}'. It may have already been deleted. Error: {ex.Message}");
            }
        }

        public async Task<int> GetParticipantCountAsync(string roomName)
        {
            try
            {
                var response = await _roomServiceClient.ListParticipants(new ListParticipantsRequest() { Room = roomName });
                return response.Participants.Count;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to get participant count for room '{roomName}': {ex.Message}");
                return 0;
            }
        }

        public string GenerateToken(string roomName, string participantIdentity, bool isBroadcaster = false)
        {
            var grant = new VideoGrants
            {
                RoomJoin = true,
                Room = roomName,
                CanPublish = isBroadcaster,
                CanSubscribe = true,
                CanPublishData = true
            };

            var token = new AccessToken(_apiKey, _apiSecret)
                .WithIdentity(participantIdentity)
                .WithTtl(TimeSpan.FromHours(1))
                .WithGrants(grant);

            return token.ToJwt();
        }

        public async Task<EgressInfo> StopEgressAsync(string egressId)
        {
            var egressClient = CreateEgressClient();
            return await egressClient.StopEgress(new StopEgressRequest { EgressId = egressId });
        }
    }
}
