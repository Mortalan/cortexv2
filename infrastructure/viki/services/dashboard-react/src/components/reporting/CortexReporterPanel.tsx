import { useState } from "react";
import "./CortexReporterPanel.css";

interface RMMOptions {
  availability: boolean;
  disk: boolean;
  cpu: boolean;
  os_version: boolean;
  performance: boolean;
}

interface EDROptions {
  alerts: boolean;
}

interface TicketOptions {
  stats: boolean;
  work: boolean;
}

interface BackupOptions {
  compliance: boolean;
}

export function CortexReporterPanel() {
  const [clientName, setClientName] = useState("PR VIP");
  const [dateRange, setDateRange] = useState(
    () => {
      const now = new Date();
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `01 ${months[now.getMonth()]} ${now.getFullYear()} – ${String(now.getDate()).padStart(2, "0")} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }
  );

  // Sections
  const [sections, setSections] = useState({
    RMM: true,
    EDR: true,
    Tickets: true,
    Backups: true,
  });

  // Detailed Selections
  const [rmmOptions, setRmmOptions] = useState<RMMOptions>({
    availability: true,
    disk: true,
    cpu: true,
    os_version: true,
    performance: true,
  });

  const [edrOptions, setEdrOptions] = useState<EDROptions>({
    alerts: true,
  });

  const [ticketOptions, setTicketOptions] = useState<TicketOptions>({
    stats: true,
    work: true,
  });

  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    compliance: true,
  });

  // State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [reportData, setReportData] = useState<{
    pdfUrl: string;
    docxBlob: Blob;
    pdfBlob: Blob;
    filename: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);


  const handleSectionToggle = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRmmToggle = (key: keyof RMMOptions) => {
    setRmmOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEdrToggle = (key: keyof EDROptions) => {
    setEdrOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTicketToggle = (key: keyof TicketOptions) => {
    setTicketOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBackupToggle = (key: keyof BackupOptions) => {
    setBackupOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const triggerGeneration = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    const steps = [
      "Establishing link with CORTEX-Core...",
      "Harvesting GLPI service tickets...",
      "Querying Forensic Data Lake alerts...",
      "Synthesizing customized DOCX boundaries...",
      "Launching headless LibreOffice compiler...",
      "Converting structures to PDF stream..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep]);
        currentStep++;
      }
    }, 1500);

    try {
      // Build API Payload
      const activeSections = Object.entries(sections)
        .filter(([_, val]) => val)
        .map(([key]) => key);

      const activeOptions = {
        RMM: Object.entries(rmmOptions).filter(([_, val]) => val).map(([key]) => key),
        EDR: Object.entries(edrOptions).filter(([_, val]) => val).map(([key]) => key),
        Tickets: Object.entries(ticketOptions).filter(([_, val]) => val).map(([key]) => key),
        Backups: Object.entries(backupOptions).filter(([_, val]) => val).map(([key]) => key),
      };

      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: clientName,
          date_range: dateRange,
          sections: activeSections,
          options: activeOptions,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error(`Compiler failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Report compilation failed");
      }

      // Convert Base64 response fields into blobs
      const docxBytes = Uint8Array.from(atob(result.docx_base64), c => c.charCodeAt(0));
      const docxBlob = new Blob([docxBytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

      const pdfBytes = Uint8Array.from(atob(result.pdf_base64), c => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      const pdfUrl = URL.createObjectURL(pdfBlob);

      setReportData({
        pdfUrl,
        docxBlob,
        pdfBlob,
        filename: result.filename || "monthly_report",
      });
    } catch (err: unknown) {
      clearInterval(interval);
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred during report generation");
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = (blob: Blob, ext: string) => {
    if (!reportData) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportData.filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerEmailDispatch = async () => {
    if (!recipientEmail) return;
    setSendingEmail(true);
    setEmailSuccess(null);
    setError(null);

    try {
      const activeSections = Object.entries(sections)
        .filter(([_, val]) => val)
        .map(([key]) => key);

      const activeOptions = {
        RMM: Object.entries(rmmOptions).filter(([_, val]) => val).map(([key]) => key),
        EDR: Object.entries(edrOptions).filter(([_, val]) => val).map(([key]) => key),
        Tickets: Object.entries(ticketOptions).filter(([_, val]) => val).map(([key]) => key),
        Backups: Object.entries(backupOptions).filter(([_, val]) => val).map(([key]) => key),
      };

      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: clientName,
          date_range: dateRange,
          sections: activeSections,
          options: activeOptions,
          email_recipient: recipientEmail,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError = "SMTP Pipeline failed";
        try {
          const errObj = JSON.parse(errorText);
          parsedError = errObj.message || parsedError;
        } catch {}
        throw new Error(parsedError);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Email dispatch failed");
      }

      setEmailSuccess(`Report compiled and sent to ${recipientEmail}`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to dispatch email");
    } finally {
      setSendingEmail(false);
    }
  };


  return (
    <div className="reporter-panel">
      <header className="reporter-header">
        <div className="title-group">
          <h1>CORTEX REPORTING CONSOLE</h1>
          <p className="subtitle">Quantum Metrics Harvesting & Compilation Node</p>
        </div>
        <button 
          className="back-btn font-space"
          onClick={() => window.close()}
        >
          BACK TO NERVOUS SYSTEM
        </button>
      </header>

      <div className="reporter-layout">
        {/* Left Column - Controls */}
        <div className="controls-column glassmorphic">
          <h2 className="panel-title font-space">REPORT SPECIFICATION</h2>
          
          <div className="form-group">
            <label className="input-label font-space">CUSTOMER SELECTOR</label>
            <select 
              value={clientName} 
              onChange={(e) => setClientName(e.target.value)}
              className="reporter-select"
            >
              <option value="PR VIP">PR VIP</option>
              <option value="Acme Corporation">Acme Corporation</option>
              <option value="Global Security Inc">Global Security Inc</option>
            </select>
          </div>

          <div className="form-group">
            <label className="input-label font-space">DATE RANGE / PERIOD</label>
            <input 
              type="text" 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="reporter-input"
              placeholder="e.g. 01 May 2026 – 25 May 2026"
            />
          </div>

          <h3 className="section-divider font-space">CORE MODULES</h3>

          {/* RMM Section */}
          <div className={`section-block ${sections.RMM ? "active" : ""}`}>
            <label className="section-label font-space">
              <input 
                type="checkbox" 
                checked={sections.RMM} 
                onChange={() => handleSectionToggle("RMM")} 
              />
              RMM TELEMETRY
            </label>
            {sections.RMM && (
              <div className="subsection-options">
                <label className="option-check font-space">
                  <input type="checkbox" checked={rmmOptions.availability} onChange={() => handleRmmToggle("availability")} />
                  Device Availability & Online Uptime
                </label>
                <label className="option-check font-space">
                  <input type="checkbox" checked={rmmOptions.disk} onChange={() => handleRmmToggle("disk")} />
                  Disk & Storage Volumes
                </label>
                <label className="option-check font-space">
                  <input type="checkbox" checked={rmmOptions.cpu} onChange={() => handleRmmToggle("cpu")} />
                  CPU / Memory Utilization
                </label>
                <label className="option-check font-space">
                  <input type="checkbox" checked={rmmOptions.os_version} onChange={() => handleRmmToggle("os_version")} />
                  Windows Version Breakdown
                </label>
                <label className="option-check font-space">
                  <input type="checkbox" checked={rmmOptions.performance} onChange={() => handleRmmToggle("performance")} />
                  Attention-Required Degradation List
                </label>
              </div>
            )}
          </div>

          {/* EDR Section */}
          <div className={`section-block ${sections.EDR ? "active" : ""}`}>
            <label className="section-label font-space">
              <input 
                type="checkbox" 
                checked={sections.EDR} 
                onChange={() => handleSectionToggle("EDR")} 
              />
              EDR ALERTS
            </label>
            {sections.EDR && (
              <div className="subsection-options">
                <label className="option-check font-space">
                  <input type="checkbox" checked={edrOptions.alerts} onChange={() => handleEdrToggle("alerts")} />
                  Velociraptor Incident Logs
                </label>
              </div>
            )}
          </div>

          {/* Tickets Section */}
          <div className={`section-block ${sections.Tickets ? "active" : ""}`}>
            <label className="section-label font-space">
              <input 
                type="checkbox" 
                checked={sections.Tickets} 
                onChange={() => handleSectionToggle("Tickets")} 
              />
              TICKET LOGS
            </label>
            {sections.Tickets && (
              <div className="subsection-options">
                <label className="option-check font-space">
                  <input type="checkbox" checked={ticketOptions.stats} onChange={() => handleTicketToggle("stats")} />
                  GLPI Monthly Trends (Open/Closed)
                </label>
                <label className="option-check font-space">
                  <input type="checkbox" checked={ticketOptions.work} onChange={() => handleTicketToggle("work")} />
                  Work Completed Summary Bullet Points
                </label>
              </div>
            )}
          </div>

          {/* Backups Section */}
          <div className={`section-block ${sections.Backups ? "active" : ""}`}>
            <label className="section-label font-space">
              <input 
                type="checkbox" 
                checked={sections.Backups} 
                onChange={() => handleSectionToggle("Backups")} 
              />
              BACKUP VAULT
            </label>
            {sections.Backups && (
              <div className="subsection-options">
                <label className="option-check font-space">
                  <input type="checkbox" checked={backupOptions.compliance} onChange={() => handleBackupToggle("compliance")} />
                  MinIO Bucket Replication Compliance
                </label>
              </div>
            )}
          </div>

          <button 
            className="compile-btn font-space"
            onClick={triggerGeneration}
            disabled={loading || (!sections.RMM && !sections.EDR && !sections.Tickets && !sections.Backups)}
          >
            {loading ? "COMPILING CUSTOM QUANTUM MATRIX..." : "COMPILE DYNAMIC REPORT"}
          </button>
        </div>

        {/* Right Column - Preview */}
        <div className="preview-column glassmorphic">
          {loading && (
            <div className="preview-loader">
              <div className="loader-ring">
                <div className="ring-slice"></div>
              </div>
              <p className="loader-step font-space blinking">{loadingStep}</p>
            </div>
          )}

          {error && (
            <div className="preview-error font-space">
              <span className="error-icon">❌</span>
              <h3>COMPILER FAULT DETECTED</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && !reportData && (
            <div className="preview-empty">
              <div className="hud-scan-line"></div>
              <span className="empty-icon">📊</span>
              <h3 className="font-space">READY FOR QUANTUM HARVEST</h3>
              <p>Configure client parameters and modules to synthesize a dynamic, high-fidelity report.</p>
            </div>
          )}

          {reportData && (
            <div className="preview-viewer">
              <div className="viewer-actions">
                <button 
                  className="viewer-action-btn font-space pdf"
                  onClick={() => triggerDownload(reportData.pdfBlob, "pdf")}
                >
                  DOWNLOAD PDF
                </button>
                <button 
                  className="viewer-action-btn font-space docx"
                  onClick={() => triggerDownload(reportData.docxBlob, "docx")}
                >
                  DOWNLOAD DOCX
                </button>
              </div>
              <div className="viewer-actions email-dispatch-container" style={{ marginTop: "15px", display: "flex", gap: "10px", alignItems: "center", width: "100%" }}>
                <input 
                  type="email" 
                  placeholder="Enter client email address..." 
                  value={recipientEmail} 
                  onChange={(e) => setRecipientEmail(e.target.value)} 
                  className="reporter-input email-input font-space"
                  style={{ flex: 1, padding: "10px", background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(0, 255, 200, 0.2)", borderRadius: "4px", color: "#00ffc8", fontSize: "14px" }}
                  disabled={sendingEmail}
                />
                <button 
                  className="viewer-action-btn font-space mail"
                  onClick={triggerEmailDispatch}
                  disabled={sendingEmail || !recipientEmail}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {sendingEmail ? "SENDING..." : "EMAIL DIRECTLY"}
                </button>
              </div>
              {emailSuccess && (
                <div className="email-status-success font-space" style={{ marginTop: "10px", padding: "10px", background: "rgba(0, 255, 128, 0.1)", border: "1px solid rgb(0, 255, 128)", borderRadius: "4px", color: "#00ff80", fontSize: "13px", textAlign: "center" }}>
                  ✓ {emailSuccess}
                </div>
              )}
              <div className="viewer-frame-container">
                <iframe 
                  src={reportData.pdfUrl} 
                  className="pdf-iframe-preview" 
                  title="On-Screen Report Preview"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
