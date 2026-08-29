/**
 * ProofChain Demo Data
 *
 * Contains sample documents for demonstration purposes.
 * All demo data is clearly labeled and should not be
 * misrepresented as real-world evidence.
 */

export interface DemoFile {
  id: string;
  name: string;
  description: string;
  type: string;
  isManipulated: boolean;
  manipulation?: string;
}

export const DEMO_FILES: DemoFile[] = [
  {
    id: "clean-invoice",
    name: "Sample_Invoice_2024.pdf",
    description: "A clean, unmodified sample invoice.",
    type: "application/pdf",
    isManipulated: false,
  },
  {
    id: "manipulated-invoice",
    name: "Altered_Invoice_2024.pdf",
    description: "A deliberately manipulated invoice with amount ₹8,500 changed to ₹18,500.",
    type: "application/pdf",
    isManipulated: true,
    manipulation: "Amount modified: ₹8,500 → ₹18,500",
  },
];

/**
 * Generate a canvas-based demo invoice image.
 * This creates a realistic-looking invoice that can be analyzed by the forensic engine.
 */
export function generateDemoInvoiceCanvas(manipulated: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 600, 800);

  // Header bar
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, 600, 80);

  // Company name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("TECHNOVA SOLUTIONS", 40, 35);

  ctx.font = "11px Arial, sans-serif";
  ctx.fillStyle = "#aaaacc";
  ctx.fillText("Invoice & Billing System", 40, 55);

  // Invoice title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillText("INVOICE", 480, 45);
  ctx.font = "10px Arial, sans-serif";
  ctx.fillStyle = "#88aacc";
  ctx.fillText("INV-2024-0847", 460, 62);

  // Invoice details section
  ctx.fillStyle = "#f0f0f5";
  ctx.fillRect(40, 100, 520, 70);

  ctx.fillStyle = "#333333";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillText("BILL TO:", 60, 125);
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("Acme Corp Ltd.", 60, 142);
  ctx.fillText("42 Business Park, Mumbai 400001", 60, 158);

  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillText("DATE:", 350, 125);
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("August 15, 2024", 350, 142);

  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillText("DUE:", 350, 155);
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("September 14, 2024", 350, 170);

  // Line items header
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(40, 200, 520, 30);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillText("DESCRIPTION", 60, 220);
  ctx.fillText("QTY", 340, 220);
  ctx.fillText("RATE", 400, 220);
  ctx.fillText("AMOUNT", 480, 220);

  // Line items
  const items = [
    { desc: "Cloud Hosting (Annual)", qty: "1", rate: "₹45,000", amount: "₹45,000" },
    { desc: "API Integration Services", qty: "1", rate: "₹18,500", amount: "₹18,500" },
    { desc: "Technical Support Package", qty: "3", rate: "₹5,000", amount: "₹15,000" },
    { desc: "Data Backup Service", qty: "12", rate: "₹1,000", amount: "₹12,000" },
  ];

  let y = 250;
  for (const item of items) {
    ctx.fillStyle = y % 48 === 0 ? "#fafafa" : "#ffffff";
    ctx.fillRect(40, y - 15, 520, 28);

    ctx.fillStyle = "#333333";
    ctx.font = "11px Arial, sans-serif";
    ctx.fillText(item.desc, 60, y);
    ctx.fillText(item.qty, 345, y);
    ctx.fillText(item.rate, 400, y);

    // The manipulated line
    if (manipulated && item.desc === "API Integration Services") {
      // Draw manipulated amount with slightly different rendering
      ctx.fillStyle = "#cc0000";
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.fillText("₹18,500", 476, y);

      // Subtle artifacts around the changed text
      ctx.fillStyle = "rgba(200, 0, 0, 0.03)";
      ctx.fillRect(470, y - 15, 80, 28);
    } else {
      ctx.fillStyle = "#333333";
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText(item.amount, 480, y);
    }

    y += 28;
  }

  // Separator line
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(340, y + 5);
  ctx.lineTo(560, y + 5);
  ctx.stroke();

  // Subtotal
  y += 25;
  ctx.fillStyle = "#555555";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("Subtotal:", 400, y);
  if (manipulated) {
    ctx.fillStyle = "#cc0000";
    ctx.font = "bold 12px Arial, sans-serif";
    ctx.fillText("₹90,500", 480, y);
  } else {
    ctx.fillText("₹80,500", 480, y);
  }

  // Tax
  y += 22;
  ctx.fillStyle = "#555555";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("GST (18%):", 400, y);
  if (manipulated) {
    ctx.fillText("₹16,290", 480, y);
  } else {
    ctx.fillText("₹14,490", 480, y);
  }

  // Separator
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(340, y + 10);
  ctx.lineTo(560, y + 10);
  ctx.stroke();

  // Total
  y += 32;
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillText("TOTAL:", 400, y);
  if (manipulated) {
    ctx.fillStyle = "#cc0000";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText("₹1,06,790", 460, y);

    // Manipulation artifacts - slightly inconsistent background
    ctx.fillStyle = "rgba(180, 0, 0, 0.02)";
    ctx.fillRect(455, y - 20, 115, 35);
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText("₹94,990", 460, y);
  }

  // Footer
  ctx.fillStyle = "#f0f0f5";
  ctx.fillRect(0, 700, 600, 100);

  ctx.fillStyle = "#888888";
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText("Payment Terms: Net 30 days", 40, 725);
  ctx.fillText("Bank: HDFC Bank | A/C: 50100234567890 | IFSC: HDFC0001234", 40, 745);

  ctx.fillText("Thank you for your business!", 40, 770);

  // Add some compression artifacts for realism
  if (manipulated) {
    // Add subtle noise around the manipulated area
    for (let i = 0; i < 50; i++) {
      const rx = 460 + Math.random() * 80;
      const ry = y - 50 + Math.random() * 80;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`;
      ctx.fillRect(rx, ry, 1, 1);
    }
  }

  return canvas;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}
