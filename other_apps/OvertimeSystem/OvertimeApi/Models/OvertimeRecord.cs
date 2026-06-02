using System;
using System.ComponentModel.DataAnnotations;

namespace OvertimeApi.Models
{
    public enum ApprovalStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public class OvertimeRecord
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string EmployeeEmail { get; set; } = string.Empty;

        public string ManagerEmail { get; set; } = "Management Ledger";

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [Range(0.1, 24.0)]
        public decimal HoursClaimed { get; set; }

        [Required]
        public string TicketingSystemId { get; set; } = string.Empty;

        [Required]
        public string DeliverableSummary { get; set; } = string.Empty;

        public ApprovalStatus Status { get; set; } = ApprovalStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ReviewedAt { get; set; }

        public bool IsSandbox { get; set; } = false;
    }
}