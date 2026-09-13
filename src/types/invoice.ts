/** A single billable row on an invoice. All money values are plain numbers. */
export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

/** The shape the extraction provider is asked to return. */
export type ExtractedInvoice = {
  supplier: string;
  supplierTaxId: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
};

export type FindingSeverity = "error" | "warning" | "info";

/** One problem the review pass spotted in the extracted data. */
export type ReviewFinding = {
  severity: FindingSeverity;
  field: string;
  message: string;
};

export type InvoiceStatus = "draft" | "sent";

/** An invoice as stored in this browser's localStorage. */
export type ProcessedInvoice = {
  id: string;
  createdAt: string;
  fileName: string;
  extracted: ExtractedInvoice;
  findings: ReviewFinding[];
  status: InvoiceStatus;
  sentAt: string | null;
};
