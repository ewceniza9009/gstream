using Livekit.Server.Sdk.Dotnet;
using Microsoft.Extensions.Configuration;
using System;

namespace gstream.Services
{
    public class LiveKitService
    {
        private readonly string _liveKitHost;
        private readonly string _apiKey;
        private readonly string _apiSecret;

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
        }

        public string GetLiveKitUrl() => _liveKitHost;

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
    }
}