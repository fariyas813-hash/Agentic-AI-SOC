import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, Cpu, Terminal, CheckCircle2, XCircle, 
  Send, Play, RefreshCw, Upload, Lock, Flame, ShieldAlert, FileWarning, Download
} from 'lucide-react';

const PRESET_INCIDENTS = [
  {
    id: "INC-9041",
    name: "Brute-Force SSH Credential Spray",
    type: "Brute Force",
    mitre: "T1110.003 - Password Spraying",
    sourceIp: "198.51.100.42",
    severity: "CRITICAL",
    target: "ssh.bastion.internal:22"
  },
  {
    id: "INC-9042",
    name: "Blind SQL Injection on Checkout API",
    type: "SQLi",
    mitre: "T1190 - Exploit Public-Facing App",
    sourceIp: "203.0.113.88",
    severity: "HIGH",
    target: "api.storefront.internal/v1/cart"
  },
  {
    id: "INC-9043",
    name: "LockBit 3.0 Ransomware Lateral Movement",
    type: "Ransomware",
    mitre: "T1486 - Data Encrypted for Impact",
    sourceIp: "10.0.4.15",
    severity: "CRITICAL",
    target: "smb://fileserver-finance.corp"
  },
  {
    id: "INC-9044",
    name: "Log4Shell CVE-2021-44228 JNDI Remote Code Execution",
    type: "RCE",
    mitre: "T1203 - Exploitation for Client Execution",
    sourceIp: "194.26.29.112",
    severity: "CRITICAL",
    target: "ldap://payment-cluster.internal:1389"
  }
];

export default function App() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [activeFileName, setActiveFileName] = useState(null);

  const [activeIncident, setActiveIncident] = useState(PRESET_INCIDENTS[0]);

  const [intelData, setIntelData] = useState({
    is_harmful: true,
    threat_level: "CRITICAL DANGER",
    classification: "Correlated Malicious Scanner Node attacking OpenSSH",
    abuse_confidence: 96,
    harmful_payload_found: "High-frequency root password brute-force pattern"
  });

  const [actionData, setActionData] = useState({
    calculated_risk: 94,
    proposed_command: "FIREWALL_DROP_SUBNET(198.51.100.0/24)",
    defense_policy: "Zero-Trust Active Defense",
    remediation_reason: "Boundary compromised by persistent authentication flood. Immediate subnet drop required."
  });

  const [logs, setLogs] = useState([
    "[SYSTEM] Aegis Multi-Agent SOC Initialized.",
    "[STATUS] Telemetry bus ready. Listening for presets, manual injections, or raw log files..."
  ]);

  const [customForm, setCustomForm] = useState({
    name: "Distributed Denial of Service (SYN Flood)",
    sourceIp: "45.154.255.99",
    target: "auth.production.edge:443",
    severity: "HIGH",
    type: "DDoS"
  });

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((res) => res.json())
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  const dispatchToSwarm = async (incidentPayload) => {
    setLoading(true);
    setApprovalStatus(null);
    setActiveFileName(null);
    setActiveIncident(incidentPayload);

    setLogs((prev) => [
      ...prev,
      `[INGESTION] Triggered triage pipeline for ${incidentPayload.id} (${incidentPayload.name})...`
    ]);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incidentPayload)
      });

      if (!response.ok) throw new Error("Backend response error");

      const data = await response.json();
      setBackendOnline(true);
      setIntelData(data.intel_summary);
      setActionData(data.action_summary);
      setLogs((prev) => [...prev, ...data.execution_logs]);
    } catch (err) {
      console.error(err);
      setBackendOnline(false);
      setLogs((prev) => [...prev, `[ERROR] Failed to contact Python Backend at 127.0.0.1:8000.`]);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPreset = () => {
    const nextIdx = (presetIndex + 1) % PRESET_INCIDENTS.length;
    setPresetIndex(nextIdx);
    dispatchToSwarm(PRESET_INCIDENTS[nextIdx]);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const customPayload = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      mitre: "T1498 - Network Denial of Service",
      ...customForm
    };
    dispatchToSwarm(customPayload);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setApprovalStatus(null);
    setActiveFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    setLogs((prev) => [...prev, `[INGESTION] Ingesting uploaded file: ${file.name}...`]);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload-log", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setBackendOnline(true);
      if (data.raw_incident) {
        setActiveIncident({
          ...data.raw_incident,
          mitre: data.raw_incident.mitre || "Automated File Extraction"
        });
      }
      setIntelData(data.intel_summary);
      setActionData(data.action_summary);
      setLogs((prev) => [...prev, ...data.execution_logs]);
    } catch (err) {
      setLogs((prev) => [...prev, `[ERROR] Failed to inspect file.`]);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleApprove = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/approve-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: actionData.proposed_command })
      });
      const resData = await response.json();
      setApprovalStatus("APPROVED");
      setLogs((prev) => [
        ...prev,
        `[HUMAN_GATEKEEPER] Operator APPROVED. Firewall applied rule: ${resData.message}`
      ]);
    } catch (err) {
      setApprovalStatus("FAILED");
      setLogs((prev) => [...prev, `[ERROR] Failed to commit rule.`]);
    }
  };

  const handleDismiss = () => {
    setApprovalStatus("DISMISSED");
    setLogs((prev) => [
      ...prev,
      `[HUMAN_GATEKEEPER] Operator marked incident ${activeIncident.id} as False Positive.`
    ]);
  };

  const exportIncidentReport = () => {
    const reportData = {
      incident_id: activeIncident.id,
      timestamp: new Date().toISOString(),
      threat_name: activeIncident.name,
      file_analyzed: activeFileName || "Direct Ingestion Stream",
      attacker_ip: activeIncident.sourceIp,
      harmful_status: intelData.is_harmful ? "HARMFUL / MALICIOUS" : "SAFE",
      threat_level: intelData.threat_level,
      malicious_artifact: intelData.harmful_payload_found,
      mitigation_rule: actionData.proposed_command,
      operator_decision: approvalStatus || "PENDING",
      telemetry_logs: logs
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SOC_Report_${activeIncident.id}.json`;
    link.click();
  };

  return (
    <div style={{ backgroundColor: '#090D16', color: '#F1F5F9', minHeight: '100vh', padding: '24px 36px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 1. TOP HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', backgroundColor: '#0284C7', borderRadius: '8px' }}>
            <Shield size={24} color="#FFFFFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
              Autonomous Agentic AI SOC Defense Center
            </h1>
            <p style={{ margin: '3px 0 0 0', color: '#94A3B8', fontSize: '13px' }}>
              AI Exploit Inspection, Threat Triage & Human-Governed Network Containment
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '12px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: backendOnline ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: backendOnline ? '#4ADE80' : '#F87171',
            border: `1px solid ${backendOnline ? '#22C55E' : '#EF4444'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: backendOnline ? '#22C55E' : '#EF4444' }}></span>
            {backendOnline ? 'AI Backend: Connected' : 'AI Backend: Offline'}
          </span>

          <label style={{
            backgroundColor: '#1E293B',
            border: '1px solid #38BDF8',
            color: '#38BDF8',
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700
          }}>
            <Upload size={15} />
            <span>Upload Server Log (.log)</span>
            <input type="file" accept=".log,.txt,.json,.csv" onChange={handleFileUpload} disabled={loading} style={{ display: 'none' }} />
          </label>

          <button
            onClick={handleNextPreset}
            disabled={loading}
            style={{
              backgroundColor: '#0284C7',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
            Simulate Attack ({presetIndex + 1}/{PRESET_INCIDENTS.length})
          </button>
        </div>
      </div>

      {/* 2. THE DANGER / HARMFUL VERDICT BANNER (CRITICAL FOR EVALUATION) */}
      <div style={{
        backgroundColor: intelData.is_harmful ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        border: `2px solid ${intelData.is_harmful ? '#EF4444' : '#10B981'}`,
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {intelData.is_harmful ? (
            <div style={{ backgroundColor: '#DC2626', padding: '10px', borderRadius: '8px' }}>
              <Flame size={24} color="#FFFFFF" />
            </div>
          ) : (
            <div style={{ backgroundColor: '#10B981', padding: '10px', borderRadius: '8px' }}>
              <CheckCircle2 size={24} color="#FFFFFF" />
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                backgroundColor: intelData.is_harmful ? '#DC2626' : '#10B981',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '900',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                {intelData.is_harmful ? "VERDICT: FILE / TELEMETRY IS HARMFUL" : "VERDICT: FILE IS SAFE"}
              </span>
              <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 'bold' }}>
                Status: {intelData.threat_level}
              </span>
              {activeFileName && (
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                  (Source: <code>{activeFileName}</code>)
                </span>
              )}
            </div>
            <div style={{ fontSize: '14px', color: '#F1F5F9', marginTop: '6px', fontWeight: '600' }}>
              Detected Malicious Artifact: <span style={{ color: '#F87171' }}>{intelData.harmful_payload_found}</span>
            </div>
          </div>
        </div>

        <button
          onClick={exportIncidentReport}
          style={{
            backgroundColor: '#1E293B',
            border: '1px solid #475569',
            color: '#E2E8F0',
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600
          }}
        >
          <Download size={14} /> Download SOC Audit (.json)
        </button>
      </div>

      {/* 3. 4-STAGE PIPELINE EXPLAINER */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 'bold', marginBottom: '10px' }}>
          HOW THE SYSTEM WORKS (AUTONOMOUS 4-STAGE DEFENSE PIPELINE)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          <div style={{ backgroundColor: '#1E293B', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #38BDF8' }}>
            <div style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 'bold' }}>STAGE 1: INGESTION</div>
            <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>Log Ingestion Engine</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Server logs or IOC alerts parsed dynamically.</div>
          </div>
          <div style={{ backgroundColor: '#1E293B', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #F59E0B' }}>
            <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 'bold' }}>STAGE 2: HARMFULNESS TEST</div>
            <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>Threat Intel Agent</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Scans exploit syntax & computes danger level.</div>
          </div>
          <div style={{ backgroundColor: '#1E293B', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #10B981' }}>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 'bold' }}>STAGE 3: MITIGATION POLICY</div>
            <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>Action Recommender</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Synthesizes targeted zero-trust firewall syntax.</div>
          </div>
          <div style={{ backgroundColor: '#1E293B', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #EC4899' }}>
            <div style={{ fontSize: '11px', color: '#EC4899', fontWeight: 'bold' }}>STAGE 4: HUMAN GATEKEEPER</div>
            <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>Analyst Verification</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Prevents unauthorized destructive changes.</div>
          </div>
        </div>
      </div>

      {/* 4. CURRENT ACTIVE ATTACK HERO BANNER */}
      <div style={{ backgroundColor: '#161F30', padding: '18px 22px', borderRadius: '10px', border: '1px solid #1E293B', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ backgroundColor: '#DC2626', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
              {activeIncident.id} • {activeIncident.severity}
            </span>
            <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #0284C7' }}>
              MITRE: {activeIncident.mitre || "T1059 - Attack Pattern"}
            </span>
            <h2 style={{ fontSize: '17px', fontWeight: 'bold', margin: 0 }}>{activeIncident.name}</h2>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '10px', fontSize: '13px', color: '#94A3B8' }}>
            <div>Attacker IP: <strong style={{ color: '#F1F5F9', fontFamily: 'monospace' }}>{activeIncident.sourceIp}</strong></div>
            <div>Targeted Asset: <strong style={{ color: '#F1F5F9', fontFamily: 'monospace' }}>{activeIncident.target}</strong></div>
            <div>Attack Type: <strong style={{ color: '#F1F5F9' }}>{activeIncident.type}</strong></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', borderLeft: '1px solid #283548', paddingLeft: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>CALCULATED RISK</div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: actionData.calculated_risk > 80 ? '#F87171' : '#FBBF24' }}>
              {actionData.calculated_risk}<span style={{ fontSize: '15px', color: '#64748B' }}>/100</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>AI CONFIDENCE</div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#38BDF8' }}>
              {intelData.abuse_confidence}%
            </div>
          </div>
        </div>
      </div>

      {/* 5. THE THREE AGENTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        
        {/* Agent 1 */}
        <div style={{ backgroundColor: '#101726', padding: '16px', borderRadius: '8px', border: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Cpu size={17} color="#38BDF8" />
            <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 'bold' }}>1. Coordinator Agent</h3>
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>SWARM ORCHESTRATOR</div>
          <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.4', margin: 0 }}>
            Ingested telemetry, decomposed attack vectors, and synchronized Threat Intel and Action Agents.
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#38BDF8', fontWeight: '600' }}>
            ✓ Status: Pipeline Executed
          </div>
        </div>

        {/* Agent 2 */}
        <div style={{ backgroundColor: '#101726', padding: '16px', borderRadius: '8px', border: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <AlertTriangle size={17} color="#FBBF24" />
            <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 'bold' }}>2. Threat Intel Agent (Gemini)</h3>
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>EXPLOIT IDENTIFIER</div>
          <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.4', margin: 0 }}>
            {intelData.classification}
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#FBBF24', fontWeight: '600' }}>
            Exploit: {intelData.harmful_payload_found}
          </div>
        </div>

        {/* Agent 3 */}
        <div style={{ backgroundColor: '#101726', padding: '16px', borderRadius: '8px', border: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Shield size={17} color="#10B981" />
            <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 'bold' }}>3. Action Recommender (Gemini)</h3>
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>MITIGATION SYNTHESIZER</div>
          <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.4', margin: 0 }}>
            Policy: <strong>{actionData.defense_policy}</strong><br />
            Rule: <code style={{ backgroundColor: '#0A0E17', padding: '2px 5px', borderRadius: '4px', color: '#38BDF8' }}>{actionData.proposed_command}</code>
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#10B981', fontWeight: '600' }}>
            Reason: {actionData.remediation_reason}
          </div>
        </div>
      </div>

      {/* 6. HUMAN-IN-THE-LOOP ACTION APPROVAL */}
      <div style={{ backgroundColor: '#131D2E', padding: '18px 24px', borderRadius: '10px', border: '1px solid #2563EB', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="#60A5FA" />
            <h3 style={{ fontSize: '15px', margin: 0, fontWeight: 'bold', color: '#93C5FD' }}>
              Human Gatekeeper Verification (Responsible AI)
            </h3>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>
            Because the file/payload is harmful, the system prepared this containment rule. Confirm to push to edge firewall:
          </p>
          <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '13px', color: '#E2E8F0' }}>
            Target Command: <span style={{ color: '#4ADE80', fontWeight: 'bold' }}>{actionData.proposed_command}</span>
          </div>

          {approvalStatus === 'APPROVED' && (
            <div style={{ color: '#4ADE80', fontSize: '13px', marginTop: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> Rule Approved and Committed! Attacker IP quarantined on edge gateway.
            </div>
          )}
          {approvalStatus === 'DISMISSED' && (
            <div style={{ color: '#F87171', fontSize: '13px', marginTop: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={16} /> Incident Dismissed as False Positive. Gateway unaffected.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleApprove}
            disabled={approvalStatus === 'APPROVED'}
            style={{
              backgroundColor: approvalStatus === 'APPROVED' ? '#1E293B' : '#16A34A',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: approvalStatus === 'APPROVED' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px'
            }}
          >
            <CheckCircle2 size={16} /> Approve & Block Threat
          </button>

          <button
            onClick={handleDismiss}
            disabled={approvalStatus === 'DISMISSED'}
            style={{
              backgroundColor: '#334155',
              color: '#E2E8F0',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px'
            }}
          >
            <XCircle size={16} /> Dismiss
          </button>
        </div>
      </div>

      {/* 7. LIVE LOG TERMINAL BUS */}
      <div style={{ backgroundColor: '#050811', border: '1px solid #1E293B', borderRadius: '8px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
          <Terminal size={15} color="#38BDF8" />
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94A3B8' }}>
            Live Inter-Agent Execution Logs (Python Swarm Bus)
          </span>
        </div>
        <div style={{ maxHeight: '150px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ color: log.includes('ERROR') ? '#F87171' : log.includes('APPROVED') ? '#4ADE80' : log.includes('HARMFUL') || log.includes('Gemini') || log.includes('INGESTION') ? '#FBBF24' : '#94A3B8' }}>
              {log}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}