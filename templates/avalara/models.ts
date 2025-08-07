import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const ConnectionMetadata = z.object({
  company: z.string(),
  backfillPeriodMs: z.number().optional()
});

export type ConnectionMetadata = z.infer<typeof ConnectionMetadata>;

export const Detail = z.object({
  id: z.number(),
  transactionLineId: z.number(),
  transactionId: z.number(),
  addressId: z.number(),
  country: z.string(),
  region: z.string(),
  stateFIPS: z.string(),
  exemptAmount: z.number(),
  exemptReasonId: z.number(),
  exemptRuleId: z.number(),
  inState: z.boolean(),
  jurisCode: z.string(),
  jurisName: z.string(),
  jurisdictionId: z.number(),
  signatureCode: z.string(),
  stateAssignedNo: z.string(),
  jurisType: z.string(),
  nonTaxableAmount: z.number(),
  nonTaxableRuleId: z.number(),
  nonTaxableType: z.string(),
  rate: z.number(),
  rateRuleId: z.number(),
  rateSourceId: z.number(),
  serCode: z.string(),
  sourcing: z.string(),
  tax: z.number(),
  taxableAmount: z.number(),
  taxType: z.string(),
  taxName: z.string(),
  taxAuthorityTypeId: z.number(),
  taxRegionId: z.number(),
  taxCalculated: z.number(),
  taxOverride: z.number(),
  rateType: z.string(),
  taxableUnits: z.number(),
  nonTaxableUnits: z.number(),
  exemptUnits: z.number(),
  reportingTaxableUnits: z.number(),
  reportingNonTaxableUnits: z.number(),
  reportingExemptUnits: z.number(),
  reportingTax: z.number(),
  reportingTaxCalculated: z.number(),
  recoverabilityPercentage: z.number(),
  recoverableAmount: z.number(),
  nonRecoverableAmount: z.number()
});

export type Detail = z.infer<typeof Detail>;

export const Line = z.object({
  id: z.number(),
  transactionId: z.number(),
  lineNumber: z.string(),
  boundaryOverrideId: z.number(),
  entityUseCode: z.string(),
  description: z.string(),
  destinationAddressId: z.number(),
  originAddressId: z.number(),
  discountAmount: z.number(),
  discountTypeId: z.number(),
  exemptAmount: z.number(),
  exemptCertId: z.number(),
  exemptNo: z.string(),
  isItemTaxable: z.boolean(),
  isSSTP: z.boolean(),
  itemCode: z.string(),
  lineAmount: z.number(),
  quantity: z.number(),
  ref1: z.string(),
  reportingDate: z.string(),
  revAccount: z.string(),
  sourcing: z.string(),
  tax: z.number(),
  taxableAmount: z.number(),
  taxCalculated: z.number(),
  taxCode: z.string(),
  taxDate: z.string(),
  taxEngine: z.string(),
  taxOverrideType: z.string(),
  taxOverrideAmount: z.number(),
  taxOverrideReason: z.string(),
  taxIncluded: z.boolean(),
  details: Detail.array(),
  vatNumberTypeId: z.number(),
  recoverabilityPercentage: z.number(),
  recoverableAmount: z.number(),
  nonRecoverableAmount: z.number()
});

export type Line = z.infer<typeof Line>;

export const TransactionAddress = z.object({
  id: z.number(),
  transactionId: z.number(),
  boundaryLevel: z.string(),
  line1: z.string(),
  city: z.string(),
  region: z.string(),
  postalCode: z.string(),
  country: z.string(),
  taxRegionId: z.number()
});

export type TransactionAddress = z.infer<typeof TransactionAddress>;

export const TaxDetailsByTaxType = z.object({
  taxType: z.string(),
  totalTaxable: z.number(),
  totalExempt: z.number(),
  totalNonTaxable: z.number(),
  totalTax: z.number()
});

export type TaxDetailsByTaxType = z.infer<typeof TaxDetailsByTaxType>;

export const Transaction = z.object({
  id: z.string(),
  code: z.string(),
  companyId: z.number(),
  date: z.string(),
  paymentDate: z.string(),
  status: z.string(),
  type: z.string(),
  batchCode: z.string(),
  currencyCode: z.string(),
  exchangeRateCurrencyCode: z.string(),
  customerUsageType: z.string(),
  entityUseCode: z.string(),
  customerVendorCode: z.string(),
  customerCode: z.string(),
  exemptNo: z.string(),
  reconciled: z.boolean(),
  locationCode: z.string(),
  reportingLocationCode: z.string(),
  purchaseOrderNo: z.string(),
  referenceCode: z.string(),
  salespersonCode: z.string(),
  taxOverrideType: z.string(),
  taxOverrideAmount: z.number(),
  taxOverrideReason: z.string(),
  totalAmount: z.number(),
  totalExempt: z.number(),
  totalDiscount: z.number(),
  totalTax: z.number(),
  totalTaxable: z.number(),
  totalTaxCalculated: z.number(),
  adjustmentReason: z.string(),
  adjustmentDescription: z.string(),
  locked: z.boolean(),
  region: z.string(),
  country: z.string(),
  version: z.number(),
  softwareVersion: z.string(),
  originAddressId: z.number(),
  destinationAddressId: z.number(),
  exchangeRateEffectiveDate: z.string(),
  exchangeRate: z.number(),
  isSellerImporterOfRecord: z.boolean(),
  description: z.string(),
  email: z.string(),
  businessIdentificationNo: z.string(),
  modifiedDate: z.string(),
  modifiedUserId: z.number(),
  taxDate: z.string(),
  lines: Line.array(),
  locationTypes: z.any().array(),
  messages: z.string().array(),
  summary: z.string().array(),
  addresses: TransactionAddress.array(),
  taxDetailsByTaxType: TaxDetailsByTaxType.array()
});

export type Transaction = z.infer<typeof Transaction>;

export const InvoiceLineItemTier = z.object({
  unitCount: z.string(),
  unitAmount: z.string(),
  totalAmount: z.number()
});

export type InvoiceLineItemTier = z.infer<typeof InvoiceLineItemTier>;

export const InvoiceLineItem = z.object({
  id: z.string().optional(),
  billingItemId: z.union([z.string(), z.null()]).optional(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  unitsCount: z.number(),
  unitAmount: z.string(),
  taxAmount: z.number(),
  taxRate: z.string(),
  amount: z.number().optional(),
  amountExcludingTax: z.number(),
  periodStart: z.union([z.string(), z.null()]),
  periodEnd: z.union([z.string(), z.null()]),
  invoiceLineItemTiers: InvoiceLineItemTier.array()
});

export type InvoiceLineItem = z.infer<typeof InvoiceLineItem>;

export const InvoiceCoupon = z.object({
  name: z.string(),
  discountAmount: z.number()
});

export type InvoiceCoupon = z.infer<typeof InvoiceCoupon>;

export const Invoice = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  emissionDate: z.string(),
  dueDate: z.string(),

  status: z.union([
    z.literal("to_pay"),
    z.literal("partially_paid"),
    z.literal("paid"),
    z.literal("late"),
    z.literal("grace_period"),
    z.literal("to_pay_batch"),
    z.literal("voided")
  ]),

  taxRate: z.string(),
  currency: z.string(),
  invoiceLineItems: InvoiceLineItem.array(),
  coupons: InvoiceCoupon.array(),
  type: z.union([z.literal("invoice"), z.literal("refund")]),
  discountAmount: z.number()
});

export type Invoice = z.infer<typeof Invoice>;

export const Address = z.object({
  line1: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional()
});

export type Address = z.infer<typeof Address>;

export const CreateTransaction = z.object({
  invoice: Invoice,
  externalCustomerId: z.string(),
  companyCode: z.string().optional(),

  addresses: z.object({
    singleLocation: Address,
    shipFrom: Address,
    shipTo: Address,
    pointOfOrderOrigin: Address,
    pointOfOrderAcceptance: Address,
    goodsPlaceOrServiceRendered: Address,
    "import": Address,
    billTo: Address
  })
});

export type CreateTransaction = z.infer<typeof CreateTransaction>;

export const TransactionCode = z.object({
  transactionCode: z.string()
});

export type TransactionCode = z.infer<typeof TransactionCode>;

export const models = {
  IdEntity: IdEntity,
  ConnectionMetadata: ConnectionMetadata,
  Detail: Detail,
  Line: Line,
  TransactionAddress: TransactionAddress,
  TaxDetailsByTaxType: TaxDetailsByTaxType,
  Transaction: Transaction,
  InvoiceLineItemTier: InvoiceLineItemTier,
  InvoiceLineItem: InvoiceLineItem,
  InvoiceCoupon: InvoiceCoupon,
  Invoice: Invoice,
  Address: Address,
  CreateTransaction: CreateTransaction,
  TransactionCode: TransactionCode
};
