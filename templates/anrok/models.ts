import { z } from "zod";

export const AnrokAddress = z.object({
  line1: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string()
});

export type AnrokAddress = z.infer<typeof AnrokAddress>;

export const AnrokLineItems = z.object({
  id: z.string(),
  productExternalId: z.string(),
  amount: z.number()
});

export type AnrokLineItems = z.infer<typeof AnrokLineItems>;

export const AnrokTaxIds = z.object({
  type: z.string(),
  value: z.string()
});

export type AnrokTaxIds = z.infer<typeof AnrokTaxIds>;

export const AnrokTransactionData = z.object({
  id: z.string().optional(),
  accountingDate: z.string(),
  currencyCode: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  customerAddress: AnrokAddress,
  lineItems: AnrokLineItems.array(),
  customerTaxIds: AnrokTaxIds.array().optional()
});

export type AnrokTransactionData = z.infer<typeof AnrokTransactionData>;

export const AnrokContact = z.object({
  external_id: z.string(),
  name: z.string(),
  address_line_1: z.string(),
  city: z.string(),
  zip: z.string(),
  country: z.string(),
  taxable: z.boolean(),
  tax_number: z.string()
});

export type AnrokContact = z.infer<typeof AnrokContact>;

export const BaseTransaction = z.object({
  id: z.string().optional(),
  issuing_date: z.string(),
  currency: z.string(),
  contact: AnrokContact
});

export type BaseTransaction = z.infer<typeof BaseTransaction>;

export const TransactionFee = z.object({
  item_id: z.string(),
  item_code: z.union([z.string(), z.null()]),
  amount_cents: z.union([z.number(), z.null()])
});

export type TransactionFee = z.infer<typeof TransactionFee>;

export const Transaction = z.object({
  id: z.string().optional(),
  issuing_date: z.string(),
  currency: z.string(),
  contact: AnrokContact,
  fees: TransactionFee.array()
});

export type Transaction = z.infer<typeof Transaction>;

export const TaxBreakdown = z.object({
  name: z.string().optional(),
  rate: z.string().optional(),
  tax_amount: z.number().optional(),
  type: z.union([z.string(), z.null()]).optional(),
  reason: z.string().optional()
});

export type TaxBreakdown = z.infer<typeof TaxBreakdown>;

export const FailedTransaction = z.object({
  id: z.string().optional(),
  issuing_date: z.string(),
  currency: z.string(),
  contact: AnrokContact,
  fees: TransactionFee.array(),
  validation_errors: z.any()
});

export type FailedTransaction = z.infer<typeof FailedTransaction>;

export const SuccessTransaction = z.object({
  id: z.string().optional(),
  issuing_date: z.string(),
  currency: z.string(),
  contact: AnrokContact,
  fees: TransactionFee.array(),
  sub_total_excluding_taxes: z.number().optional(),
  taxes_amount_cents: z.number().optional()
});

export type SuccessTransaction = z.infer<typeof SuccessTransaction>;

export const TransactionActionResponse = z.object({
  succeeded: SuccessTransaction.array(),
  failed: FailedTransaction.array()
});

export type TransactionActionResponse = z.infer<typeof TransactionActionResponse>;

export const TransactionToNegate = z.object({
  id: z.string(),
  voided_id: z.string()
});

export type TransactionToNegate = z.infer<typeof TransactionToNegate>;

export const TransactionToDelete = z.object({
  id: z.string()
});

export type TransactionToDelete = z.infer<typeof TransactionToDelete>;

export const FailedTransactionToNegate = z.object({
  id: z.string(),
  voided_id: z.string(),
  validation_errors: z.any()
});

export type FailedTransactionToNegate = z.infer<typeof FailedTransactionToNegate>;

export const TransactionNegationActionResponse = z.object({
  succeeded: TransactionToNegate.array(),
  failed: FailedTransactionToNegate.array()
});

export type TransactionNegationActionResponse = z.infer<typeof TransactionNegationActionResponse>;

export const FailedTransactionToDelete = z.object({
  id: z.string(),
  validation_errors: z.any()
});

export type FailedTransactionToDelete = z.infer<typeof FailedTransactionToDelete>;

export const TransactionDeletionActionResponse = z.object({
  succeeded: TransactionToDelete.array(),
  failed: FailedTransactionToDelete.array()
});

export type TransactionDeletionActionResponse = z.infer<typeof TransactionDeletionActionResponse>;

export const TransactionFeeWithTaxBreakdown = z.object({
  item_id: z.string(),
  item_code: z.union([z.string(), z.null()]),
  amount_cents: z.union([z.number(), z.null()]),
  tax_amount_cents: z.number(),
  tax_breakdown: TaxBreakdown.array()
});

export type TransactionFeeWithTaxBreakdown = z.infer<typeof TransactionFeeWithTaxBreakdown>;
export const Anonymous_anrok_action_createorupdatetransaction_input = Transaction.array();
export type Anonymous_anrok_action_createorupdatetransaction_input = z.infer<typeof Anonymous_anrok_action_createorupdatetransaction_input>;
export const Anonymous_anrok_action_voidtransaction_input = TransactionToDelete.array();
export type Anonymous_anrok_action_voidtransaction_input = z.infer<typeof Anonymous_anrok_action_voidtransaction_input>;
export const Anonymous_anrok_action_negatetransaction_input = TransactionToNegate.array();
export type Anonymous_anrok_action_negatetransaction_input = z.infer<typeof Anonymous_anrok_action_negatetransaction_input>;

export const models = {
  AnrokAddress: AnrokAddress,
  AnrokLineItems: AnrokLineItems,
  AnrokTaxIds: AnrokTaxIds,
  AnrokTransactionData: AnrokTransactionData,
  AnrokContact: AnrokContact,
  BaseTransaction: BaseTransaction,
  TransactionFee: TransactionFee,
  Transaction: Transaction,
  TaxBreakdown: TaxBreakdown,
  FailedTransaction: FailedTransaction,
  SuccessTransaction: SuccessTransaction,
  TransactionActionResponse: TransactionActionResponse,
  TransactionToNegate: TransactionToNegate,
  TransactionToDelete: TransactionToDelete,
  FailedTransactionToNegate: FailedTransactionToNegate,
  TransactionNegationActionResponse: TransactionNegationActionResponse,
  FailedTransactionToDelete: FailedTransactionToDelete,
  TransactionDeletionActionResponse: TransactionDeletionActionResponse,
  TransactionFeeWithTaxBreakdown: TransactionFeeWithTaxBreakdown,
  Anonymous_anrok_action_createorupdatetransaction_input: Anonymous_anrok_action_createorupdatetransaction_input,
  Anonymous_anrok_action_voidtransaction_input: Anonymous_anrok_action_voidtransaction_input,
  Anonymous_anrok_action_negatetransaction_input: Anonymous_anrok_action_negatetransaction_input
};
