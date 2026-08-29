import{c as r}from"./index-DUVv4ekN.js";const p=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],f=r("download",p);function c(e){switch(e){case"high":return"⚠ HIGH";case"medium":return"⚠ MEDIUM";case"low":return"✓ LOW";default:return"?"}}function l(e){switch(e){case"low":return"#22c55e";case"moderate":return"#f59e0b";case"high":return"#ef4444";case"critical":return"#dc2626";default:return"#6b7280"}}function m(e,n,a){const t=l(e.riskLevel),d=e.riskLevel.toUpperCase(),s=new Date().toLocaleString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"}),o=e.findings.map(i=>`
    <div style="border: 2px solid #e5e7eb; padding: 16px; margin-bottom: 12px; border-radius: 4px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">${i.category.replace("_"," ")}</span>
        <span style="font-weight: 700; font-size: 12px; text-transform: uppercase; padding: 4px 8px; background: ${i.severity==="high"?"#fef2f2":i.severity==="medium"?"#fefce8":"#f0fdf4"}; border: 2px solid ${i.severity==="high"?"#ef4444":i.severity==="medium"?"#eab308":"#22c55e"};">${c(i.severity)}</span>
      </div>
      <p style="font-weight: 700; font-size: 14px; margin: 0 0 4px 0;">${i.finding}</p>
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px 0;">Confidence: ${i.confidence}%</p>
      <p style="font-size: 13px; margin: 8px 0;">${i.userExplanation}</p>
      <div style="background: #f9fafb; padding: 8px; border: 1px solid #e5e7eb; font-size: 11px; font-family: monospace; margin-top: 8px;">${i.evidence}</div>
    </div>
  `).join("");return`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ProofChain Forensic Report — ${e.metadata.fileName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1a1a2e; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 3px solid #1a1a2e; }
    .brand { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; }
    .brand span { color: #10b981; }
    .meta { font-size: 12px; color: #6b7280; text-align: right; }
    .score-section { display: flex; align-items: center; gap: 32px; margin: 24px 0; padding: 24px; background: #f9fafb; border: 2px solid #e5e7eb; }
    .score-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; border: 4px solid ${t}; color: ${t}; background: white; }
    .risk-badge { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; padding: 8px 16px; border: 3px solid ${t}; color: ${t}; }
    .section { margin: 24px 0; }
    .section-title { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 0; border-bottom: 2px solid #1a1a2e; margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-item { padding: 8px; background: #f9fafb; border: 1px solid #e5e7eb; }
    .info-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #6b7280; letter-spacing: 0.1em; }
    .info-value { font-size: 13px; font-weight: 600; }
    .ai-section { background: #f0fdf4; border: 2px solid #22c55e; padding: 20px; margin: 24px 0; }
    .ai-section h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; color: #16a34a; }
    .ai-text { font-size: 13px; line-height: 1.6; }
    .ai-text p { margin-bottom: 12px; }
    .disclaimer { margin-top: 32px; padding: 16px; background: #fefce8; border: 2px solid #eab308; font-size: 11px; }
    .disclaimer strong { display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 20px; }
      .score-section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">PROOF<span>CHAIN</span></div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Digital Integrity Analysis Report</div>
    </div>
    <div class="meta">
      <div style="font-weight: 700;">Generated: ${s}</div>
      <div>Analysis Engine v1.0</div>
    </div>
  </div>

  <div class="score-section">
    <div class="score-circle">${e.integrityScore}</div>
    <div>
      <div class="risk-badge" style="border-color: ${t}; color: ${t};">${d}</div>
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        Integrity Score: ${e.integrityScore} / 100
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">File Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">File Name</div>
        <div class="info-value">${e.metadata.fileName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">File Type</div>
        <div class="info-value">${e.metadata.fileType}</div>
      </div>
      <div class="info-item">
        <div class="info-label">File Size</div>
        <div class="info-value">${(e.metadata.fileSize/1024).toFixed(1)} KB</div>
      </div>
      <div class="info-item">
        <div class="info-label">Analysis Date</div>
        <div class="info-value">${e.metadata.analysisTimestamp}</div>
      </div>
    </div>
  </div>

  ${a?`
  <div class="section">
    <div class="section-title">Analyzed Document</div>
    <div style="text-align: center; border: 2px solid #e5e7eb; padding: 16px;">
      <img src="${a}" style="max-width: 100%; max-height: 300px; object-fit: contain;" alt="Analyzed document" />
    </div>
  </div>
  `:""}

  <div class="section">
    <div class="section-title">Forensic Findings (${e.findings.length})</div>
    ${o}
  </div>

  ${n?`
  <div class="ai-section">
    <h3>AI-Assisted Analysis</h3>
    <div class="ai-text">
      <p><strong>Executive Summary:</strong></p>
      <p>${n.executiveSummary}</p>
      <p><strong>Evidence Significance:</strong></p>
      <p>${n.evidenceMatters.replace(/\n\n/g,"</p><p>")}</p>
      <p><strong>Plain-English Interpretation:</strong></p>
      <p>${n.plainEnglish}</p>
      <p><strong>Recommended Next Steps:</strong></p>
      <p>${n.recommendedNextStep}</p>
    </div>
  </div>
  `:""}

  <div class="disclaimer">
    <strong>Disclaimer</strong>
    This report is generated by an automated forensic analysis system and is provided as informational guidance only.
    It does not constitute legal advice, a professional forensic examination, or a certification of document authenticity.
    The integrity score and findings are based on algorithmic analysis and should be interpreted by qualified personnel.
    For official legal or compliance purposes, please consult a certified digital forensics professional.
  </div>

  <div class="footer">
    <span>ProofChain — Evidence-backed Digital Integrity Analysis</span>
    <span>Report generated automatically. Do not modify this document.</span>
  </div>
</body>
</html>
  `}function v(e,n,a){const t=m(e,n,a),d=new Blob([t],{type:"text/html"}),s=URL.createObjectURL(d),o=document.createElement("a");o.href=s,o.download=`ProofChain_Report_${e.metadata.fileName.replace(/\.[^.]+$/,"")}_${new Date().toISOString().split("T")[0]}.html`,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(s)}export{f as D,v as d};
