using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;

namespace gstream.Authentication
{
    // This class holds the options for our authentication scheme.
    public class ApiKeyAuthenticationSchemeOptions : AuthenticationSchemeOptions { }

    // This is the core handler that processes the request and performs authentication.
    public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationSchemeOptions>
    {
        private const string ApiKeyHeaderName = "X-Api-Key";
        private readonly IConfiguration _configuration;

        public ApiKeyAuthenticationHandler(
            IOptionsMonitor<ApiKeyAuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock,
            IConfiguration configuration) : base(options, logger, encoder, clock)
        {
            _configuration = configuration;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // 1. Check if the X-Api-Key header exists.
            if (!Request.Headers.TryGetValue(ApiKeyHeaderName, out var apiKeyHeaderValues))
            {
                return AuthenticateResult.NoResult(); // No header, so we don't handle this.
            }

            // 2. Get the secret API key from our app's configuration.
            var providedApiKey = apiKeyHeaderValues.FirstOrDefault();
            var configuredApiKey = _configuration.GetValue<string>("ApiKey");

            // 3. If the header is missing a value or the configured key is missing, fail.
            if (string.IsNullOrWhiteSpace(providedApiKey) || string.IsNullOrWhiteSpace(configuredApiKey))
            {
                return AuthenticateResult.Fail("API Key is not configured or provided.");
            }

            // 4. Compare the provided key with the configured key.
            if (!providedApiKey.Equals(configuredApiKey))
            {
                return AuthenticateResult.Fail("Invalid API Key.");
            }

            // 5. If the key is valid, create a claims principal for the authenticated user.
            var claims = new[] { new Claim(ClaimTypes.Name, "ApiKeyUser") };
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
    }
}
