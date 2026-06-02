using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace OvertimeApi.Services
{
    public class GlpiTicketService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public GlpiTicketService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _config = config;
        }

        public async Task<List<object>> GetActiveTicketsAsync(string userEmail, bool forceSandbox)
        {
            if (forceSandbox)
            {
                return new List<object>
                {
                    new { id = "FITS-701", title = "Elementor Custom Plugin - Deactivation Grace Trigger Build" },
                    new { id = "FITS-704", title = "Backups Optimization - Comprehensive Technical CRO Audit" },
                    new { id = "FITS-709", title = "Workplace Security Stack -ISO Compliance Review" },
                    new { id = "FITS-712", title = "Hosting Environment - Production Virtual Server Storage Expansion" }
                };
            }

            var baseUrl = _config["Glpi:BaseUrl"];
            var appToken = _config["Glpi:AppToken"];
            var userToken = _config["Glpi:UserToken"];

            if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(appToken))
            {
                return new List<object>
                {
                    new { id = "1042", title = "Server database production optimization" },
                    new { id = "1045", title = "Client network firewall patch" }
                };
            }

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("App-Token", appToken);
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"user_token {userToken}");

            try 
            {
                var sessionResponse = await _httpClient.GetAsync($"{baseUrl}/initSession/");
                sessionResponse.EnsureSuccessStatusCode();
                var sessionData = await sessionResponse.Content.ReadAsStringAsync();
                var sessionToken = JsonSerializer.Deserialize<JsonElement>(sessionData).GetProperty("session_token").GetString();

                _httpClient.DefaultRequestHeaders.Add("Session-Token", sessionToken);
                var ticketsResponse = await _httpClient.GetAsync($"{baseUrl}/Ticket?searchText[name]={userEmail}");
                
                if (ticketsResponse.IsSuccessStatusCode)
                {
                    var ticketsData = await ticketsResponse.Content.ReadAsStringAsync();
                    return JsonSerializer.Deserialize<List<object>>(ticketsData) ?? new List<object>();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GLPI synchronization failure: {ex.Message}");
            }
            return new List<object>();
        }

        public async Task<bool> PostTicketCommentAsync(string ticketId, string commentText, bool forceSandbox)
        {
            if (forceSandbox) return true;

            var baseUrl = _config["Glpi:BaseUrl"];
            var appToken = _config["Glpi:AppToken"];
            var userToken = _config["Glpi:UserToken"];

            if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(appToken)) return true;

            try
            {
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("App-Token", appToken);
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"user_token {userToken}");

                var sessionResponse = await _httpClient.GetAsync($"{baseUrl}/initSession/");
                sessionResponse.EnsureSuccessStatusCode();
                var sessionData = await sessionResponse.Content.ReadAsStringAsync();
                var sessionToken = JsonSerializer.Deserialize<JsonElement>(sessionData).GetProperty("session_token").GetString();

                _httpClient.DefaultRequestHeaders.Add("Session-Token", sessionToken);

                var payload = new
                {
                    input = new
                    {
                        items_id = int.Parse(ticketId),
                        itemtype = "Ticket",
                        content = commentText,
                        is_private = 0 
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var postResponse = await _httpClient.PostAsync($"{baseUrl}/ITILFollowup", content);
                return postResponse.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to push comment to GLPI: {ex.Message}");
                return false;
            }
        }
    }
}