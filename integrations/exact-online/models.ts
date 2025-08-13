import { z } from "zod";

export const ExactCustomer = z.object({
  id: z.string(),
  division: z.union([z.number(), z.null()]),
  name: z.string(),
  email: z.union([z.string(), z.null()]),
  taxNumber: z.union([z.string(), z.null()]),
  addressLine1: z.union([z.string(), z.null()]),
  addressLine2: z.union([z.string(), z.null()]),
  city: z.union([z.string(), z.null()]),
  zip: z.union([z.string(), z.null()]),
  country: z.union([z.string(), z.null()]),
  state: z.union([z.string(), z.null()]),
  phone: z.union([z.string(), z.null()])
});

export type ExactCustomer = z.infer<typeof ExactCustomer>;

export const ExactCustomerCreateBase = z.object({
  name: z.string(),
  email: z.union([z.string(), z.null()]).optional(),
  taxNumber: z.union([z.string(), z.null()]).optional(),
  addressLine1: z.union([z.string(), z.null()]).optional(),
  addressLine2: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  zip: z.union([z.string(), z.null()]).optional(),
  country: z.union([z.string(), z.null()]).optional(),
  state: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional()
});

export type ExactCustomerCreateBase = z.infer<typeof ExactCustomerCreateBase>;

export const ExactCustomerCreateInput = z.object({
  name: z.string(),
  email: z.union([z.string(), z.null()]).optional(),
  taxNumber: z.union([z.string(), z.null()]).optional(),
  addressLine1: z.union([z.string(), z.null()]).optional(),
  addressLine2: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  zip: z.union([z.string(), z.null()]).optional(),
  country: z.union([z.string(), z.null()]).optional(),
  state: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional()
});

export type ExactCustomerCreateInput = z.infer<typeof ExactCustomerCreateInput>;

export const ExactCustomerCreateOutput = z.object({
  id: z.string()
});

export type ExactCustomerCreateOutput = z.infer<typeof ExactCustomerCreateOutput>;

export const ExactCustomerUpdateInput = z.object({
  name: z.union([z.string(), z.null()]).optional(),
  email: z.union([z.string(), z.null()]).optional(),
  taxNumber: z.union([z.string(), z.null()]).optional(),
  addressLine1: z.union([z.string(), z.null()]).optional(),
  addressLine2: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  zip: z.union([z.string(), z.null()]).optional(),
  country: z.union([z.string(), z.null()]).optional(),
  state: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  id: z.string()
});

export type ExactCustomerUpdateInput = z.infer<typeof ExactCustomerUpdateInput>;

export const ExactCustomerUpdateOutput = z.object({
  success: z.boolean()
});

export type ExactCustomerUpdateOutput = z.infer<typeof ExactCustomerUpdateOutput>;

export const ExactPayment = z.object({
  id: z.string(),
  description: z.union([z.string(), z.null()]),
  division: z.union([z.number(), z.null()]),
  customerId: z.union([z.string(), z.null()]),
  amount: z.union([z.number(), z.null()]),
  createdAt: z.union([z.string(), z.null()]),
  currency: z.union([z.string(), z.null()]),
  journal: z.union([z.string(), z.null()]),
  paymentMethod: z.union([z.string(), z.null()]),
  paymentReference: z.union([z.string(), z.null()]),
  status: z.union([z.number(), z.null()]),
  transactionID: z.union([z.string(), z.null()])
});

export type ExactPayment = z.infer<typeof ExactPayment>;

export const ExactInvoiceLine = z.object({
  itemId: z.string(),
  quantity: z.number(),
  amountNet: z.number(),
  vatCode: z.string().optional(),
  description: z.string().optional()
});

export type ExactInvoiceLine = z.infer<typeof ExactInvoiceLine>;

export const ExactInvoiceCreateInput = z.object({
  customerId: z.string(),
  journal: z.number().optional(),
  currency: z.literal("EUR").optional(),
  description: z.string().optional(),
  createdAt: z.date().optional(),
  lines: ExactInvoiceLine.array()
});

export type ExactInvoiceCreateInput = z.infer<typeof ExactInvoiceCreateInput>;

export const ExactInvoiceCreateOutput = z.object({
  id: z.string()
});

export type ExactInvoiceCreateOutput = z.infer<typeof ExactInvoiceCreateOutput>;

export const ExactInvoiceUpdateInput = z.object({
  id: z.string(),
  deliverTo: z.string().optional(),
  currency: z.literal("EUR").optional(),
  description: z.string().optional(),
  createdAt: z.date().optional()
});

export type ExactInvoiceUpdateInput = z.infer<typeof ExactInvoiceUpdateInput>;

export const ExactInvoiceUpdateOutput = z.object({
  success: z.boolean()
});

export type ExactInvoiceUpdateOutput = z.infer<typeof ExactInvoiceUpdateOutput>;

export const ExactInvoiceAttachFileInput = z.object({
  invoiceId: z.string(),
  customerId: z.string(),
  subject: z.string(),
  filename: z.string(),
  content: z.string()
});

export type ExactInvoiceAttachFileInput = z.infer<typeof ExactInvoiceAttachFileInput>;

export const ExactInvoiceAttachFileOutput = z.object({
  success: z.boolean()
});

export type ExactInvoiceAttachFileOutput = z.infer<typeof ExactInvoiceAttachFileOutput>;

export const models = {
  ExactCustomer: ExactCustomer,
  ExactCustomerCreateBase: ExactCustomerCreateBase,
  ExactCustomerCreateInput: ExactCustomerCreateInput,
  ExactCustomerCreateOutput: ExactCustomerCreateOutput,
  ExactCustomerUpdateInput: ExactCustomerUpdateInput,
  ExactCustomerUpdateOutput: ExactCustomerUpdateOutput,
  ExactPayment: ExactPayment,
  ExactInvoiceLine: ExactInvoiceLine,
  ExactInvoiceCreateInput: ExactInvoiceCreateInput,
  ExactInvoiceCreateOutput: ExactInvoiceCreateOutput,
  ExactInvoiceUpdateInput: ExactInvoiceUpdateInput,
  ExactInvoiceUpdateOutput: ExactInvoiceUpdateOutput,
  ExactInvoiceAttachFileInput: ExactInvoiceAttachFileInput,
  ExactInvoiceAttachFileOutput: ExactInvoiceAttachFileOutput
};