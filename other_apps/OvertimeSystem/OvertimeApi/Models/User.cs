using System;
using System.ComponentModel.DataAnnotations;

namespace OvertimeApi.Models
{
    public class User
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty; // Stored securely as text for local setup clarity

        [Required]
        public string Role { get; set; } = "User"; // Roles allowed: "User" or "Admin"

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}