/**
 * ProofChain Demo Data
 *
 * Contains sample documents for demonstration purposes.
 * Generates real PDF invoices using pdf-lib.
 * All demo data is clearly labeled and should not be
 * misrepresented as real-world evidence.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
 * Generate a real PDF invoice document.
 * The manipulated version changes the API Integration line from ₹8,500 to ₹18,500
 * and adjusts the subtotal/total accordingly (creating an arithmetic inconsistency).
 */
export async function generateDemoInvoicePdf(
  manipulated: boolean
): Promise<{ blob: Blob; dataUrl: string }> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]); // US Letter
  const { width } = page.getSize();

  // Colors
  const darkBlue = rgb(0.1, 0.1, 0.18);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.94, 0.94, 0.96);
  const black = rgb(0.13, 0.13, 0.13);
  const red = manipulated ? rgb(0.8, 0, 0) : black;

  let y = 720;

  // Header background
  page.drawRectangle({
    x: 40,
    y: y - 55,
    width: width - 80,
    height: 65,
    color: darkBlue,
  });

  // Company name
  page.drawText("TECHNOVA SOLUTIONS", {
    x: 55,
    y: y - 15,
    size: 20,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText("Invoice & Billing System", {
    x: 55,
    y: y - 35,
    size: 9,
    font,
    color: rgb(0.67, 0.67, 0.8),
  });

  // Invoice label
  page.drawText("INVOICE", {
    x: width - 130,
    y: y - 12,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText("INV-2024-0847", {
    x: width - 130,
    y: y - 30,
    size: 9,
    font,
    color: rgb(0.53, 0.67, 0.8),
  });

  y -= 80;

  // Bill To section
  page.drawRectangle({
    x: 40,
    y: y - 65,
    width: width - 80,
    height: 65,
    color: lightGray,
  });

  page.drawText("BILL TO:", { x: 55, y: y - 12, size: 9, font: boldFont, color: black });
  page.drawText("Acme Corp Ltd.", { x: 55, y: y - 27, size: 10, font, color: black });
  page.drawText("42 Business Park, Mumbai 400001", { x: 55, y: y - 42, size: 10, font, color: black });

  page.drawText("DATE:", { x: 350, y: y - 12, size: 9, font: boldFont, color: black });
  page.drawText("August 15, 2024", { x: 350, y: y - 27, size: 10, font, color: black });

  page.drawText("DUE:", { x: 350, y: y - 42, size: 9, font: boldFont, color: black });
  page.drawText("September 14, 2024", { x: 350, y: y - 57, size: 10, font, color: black });

  y -= 90;

  // Table header
  page.drawRectangle({
    x: 40,
    y: y - 25,
    width: width - 80,
    height: 25,
    color: darkBlue,
  });

  page.drawText("DESCRIPTION", { x: 55, y: y - 17, size: 9, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText("QTY", { x: 340, y: y - 17, size: 9, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText("RATE", { x: 395, y: y - 17, size: 9, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText("AMOUNT", { x: 475, y: y - 17, size: 9, font: boldFont, color: rgb(1, 1, 1) });

  y -= 35;

  // Line items
  const items = [
    { desc: "Cloud Hosting (Annual)", qty: "1", rate: "45,000", amount: "45,000", cleanAmount: "45,000" },
    { desc: "API Integration Services", qty: "1", rate: manipulated ? "18,500" : "8,500", amount: manipulated ? "18,500" : "8,500", cleanAmount: "8,500" },
    { desc: "Technical Support Package", qty: "3", rate: "5,000", amount: "15,000", cleanAmount: "15,000" },
    { desc: "Data Backup Service", qty: "12", rate: "1,000", amount: "12,000", cleanAmount: "12,000" },
  ];

  for (const item of items) {
    const isModified = manipulated && item.desc === "API Integration Services";
    const itemColor = isModified ? red : black;
    const itemFont = isModified ? boldFont : font;

    page.drawText(item.desc, { x: 55, y, size: 10, font, color: black });
    page.drawText(item.qty, { x: 345, y, size: 10, font, color: black });
    page.drawText(item.rate, { x: 395, y, size: 10, font, color: black });
    page.drawText(`₹${item.amount}`, { x: 470, y, size: 10, font: itemFont, color: itemColor });

    y -= 25;
  }

  // Separator
  page.drawLine({
    start: { x: 340, y: y + 5 },
    end: { x: width - 55, y: y + 5 },
    thickness: 1.5,
    color: darkBlue,
  });

  y -= 15;

  // Subtotal — if manipulated, use wrong total (80,500→90,500 arithmetic error)
  const subtotal = manipulated ? "90,500" : "80,500";
  page.drawText("Subtotal:", { x: 385, y, size: 10, font, color: gray });
  page.drawText(`₹${subtotal}`, { x: 470, y, size: 10, font: manipulated ? boldFont : font, color: manipulated ? red : black });

  y -= 22;

  // Tax
  const tax = manipulated ? "16,290" : "14,490";
  page.drawText("GST (18%):", { x: 385, y, size: 10, font, color: gray });
  page.drawText(`₹${tax}`, { x: 470, y, size: 10, font, color: manipulated ? red : black });

  y -= 15;

  // Separator
  page.drawLine({
    start: { x: 340, y: y },
    end: { x: width - 55, y: y },
    thickness: 2,
    color: darkBlue,
  });

  y -= 20;

  // Total
  const total = manipulated ? "1,06,790" : "94,990";
  page.drawText("TOTAL:", { x: 385, y, size: 12, font: boldFont, color: darkBlue });
  page.drawText(`₹${total}`, { x: 465, y, size: 14, font: boldFont, color: manipulated ? red : darkBlue });

  // Footer
  const footerY = 90;
  page.drawRectangle({
    x: 40,
    y: footerY - 10,
    width: width - 80,
    height: 50,
    color: lightGray,
  });

  page.drawText("Payment Terms: Net 30 days", { x: 55, y: footerY + 20, size: 8, font, color: gray });
  page.drawText("Bank: HDFC Bank | A/C: 50100234567890 | IFSC: HDFC0001234", { x: 55, y: footerY + 5, size: 8, font, color: gray });
  page.drawText("Thank you for your business!", { x: 55, y: footerY - 10, size: 8, font, color: gray });

  // Serialize
  const pdfBytes = await pdfDoc.save();

  // Convert to data URL (avoid SharedArrayBuffer issues)
  let binary = "";
  for (let i = 0; i < pdfBytes.length; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }
  const base64 = btoa(binary);
  const dataUrl = `data:application/pdf;base64,${base64}`;

  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });

  return { blob, dataUrl };
}
