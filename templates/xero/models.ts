import { z } from "zod";

export const ActionErrorResponse = z.object({
  message: z.string()
});

export type ActionErrorResponse = z.infer<typeof ActionErrorResponse>;

export const BaseContact = z.object({
  name: z.string()
});

export type BaseContact = z.infer<typeof BaseContact>;

export const CreateContact = z.object({
  name: z.string(),
  external_id: z.string().optional(),
  email: z.string().optional(),
  tax_number: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional()
});

export type CreateContact = z.infer<typeof CreateContact>;

export const Contact = z.object({
  name: z.string(),
  id: z.string(),
  external_id: z.union([z.string(), z.null()]),
  email: z.union([z.string(), z.null()]),
  tax_number: z.union([z.string(), z.null()]),
  address_line_1: z.union([z.string(), z.null()]).optional(),
  address_line_2: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]),
  zip: z.union([z.string(), z.null()]),
  country: z.union([z.string(), z.null()]),
  state: z.union([z.string(), z.null()]),
  phone: z.union([z.string(), z.null()]),
  subsidiary: z.union([z.string(), z.null()]).optional()
});

export type Contact = z.infer<typeof Contact>;

export const FailedContact = z.object({
  name: z.string(),
  id: z.string(),
  external_id: z.union([z.string(), z.null()]),
  email: z.union([z.string(), z.null()]),
  tax_number: z.union([z.string(), z.null()]),
  address_line_1: z.union([z.string(), z.null()]).optional(),
  address_line_2: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]),
  zip: z.union([z.string(), z.null()]),
  country: z.union([z.string(), z.null()]),
  state: z.union([z.string(), z.null()]),
  phone: z.union([z.string(), z.null()]),
  subsidiary: z.union([z.string(), z.null()]).optional(),
  validation_errors: z.any().array()
});

export type FailedContact = z.infer<typeof FailedContact>;

export const ContactActionResponse = z.object({
  succeededContacts: Contact.array(),
  failedContacts: FailedContact.array()
});

export type ContactActionResponse = z.infer<typeof ContactActionResponse>;

export const Account = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  type: z.string(),
  tax_type: z.string(),
  description: z.union([z.string(), z.null()]),
  "class": z.string(),
  bank_account_type: z.string(),
  reporting_code: z.string(),
  reporting_code_name: z.string(),
  currency_code: z.string().optional()
});

export type Account = z.infer<typeof Account>;

export const Item = z.object({
  id: z.string(),
  item_code: z.union([z.string(), z.null()]),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  account_code: z.union([z.string(), z.null()])
});

export type Item = z.infer<typeof Item>;

export const FailedItem = z.object({
  id: z.string(),
  item_code: z.union([z.string(), z.null()]),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  account_code: z.union([z.string(), z.null()]),
  validation_errors: z.any().array()
});

export type FailedItem = z.infer<typeof FailedItem>;

export const ItemActionResponse = z.object({
  succeededItems: Item.array(),
  failedItems: FailedItem.array()
});

export type ItemActionResponse = z.infer<typeof ItemActionResponse>;

export const BasePayment = z.object({
  date: z.union([z.string(), z.null()]),
  amount_cents: z.number(),
  external_contact_id: z.string().optional(),
  account_code: z.string().optional(),
  account_id: z.string().optional()
});

export type BasePayment = z.infer<typeof BasePayment>;

export const CreatePayment = z.object({
  date: z.union([z.string(), z.null()]),
  amount_cents: z.number(),
  external_contact_id: z.string().optional(),
  account_code: z.string().optional(),
  account_id: z.string().optional(),
  status: z.string().optional(),
  invoice_id: z.string().optional(),
  credit_note_id: z.string().optional()
});

export type CreatePayment = z.infer<typeof CreatePayment>;

export const Payment = z.object({
  date: z.union([z.string(), z.null()]),
  amount_cents: z.number(),
  external_contact_id: z.string().optional(),
  account_code: z.string().optional(),
  account_id: z.string().optional(),
  id: z.string(),
  status: z.string(),
  invoice_id: z.union([z.string(), z.null()]),
  credit_note_id: z.union([z.string(), z.null()])
});

export type Payment = z.infer<typeof Payment>;

export const FailedPayment = z.object({
  date: z.union([z.string(), z.null()]),
  amount_cents: z.number(),
  external_contact_id: z.string().optional(),
  account_code: z.string().optional(),
  account_id: z.string().optional(),
  id: z.string(),
  status: z.string(),
  invoice_id: z.union([z.string(), z.null()]),
  credit_note_id: z.union([z.string(), z.null()]),
  validation_errors: z.any().array()
});

export type FailedPayment = z.infer<typeof FailedPayment>;

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const StatusOutput = z.object({
  status: z.string()
});

export type StatusOutput = z.infer<typeof StatusOutput>;

export const PaymentActionResponse = z.object({
  succeededPayment: Payment.array(),
  failedPayments: FailedPayment.array()
});

export type PaymentActionResponse = z.infer<typeof PaymentActionResponse>;

export const BaseInvoice = z.object({
  type: z.union([z.literal("ACCPAY"), z.literal("ACCREC")]),
  external_contact_id: z.string(),
  url: z.string().optional()
});

export type BaseInvoice = z.infer<typeof BaseInvoice>;

export const BaseInvoiceFee = z.object({
  account_code: z.string().optional(),
  item_code: z.union([z.string(), z.null()]).optional(),
  account_external_id: z.union([z.string(), z.null()]).optional(),
  discount_amount_cents: z.union([z.number(), z.null()]).optional(),
  discount_rate: z.union([z.number(), z.null()]).optional()
});

export type BaseInvoiceFee = z.infer<typeof BaseInvoiceFee>;

export const CreateInvoiceFee = z.object({
  account_code: z.string().optional(),
  item_code: z.union([z.string(), z.null()]).optional(),
  account_external_id: z.union([z.string(), z.null()]).optional(),
  discount_amount_cents: z.union([z.number(), z.null()]).optional(),
  discount_rate: z.union([z.number(), z.null()]).optional(),
  item_id: z.string().optional(),
  description: z.string(),
  units: z.number().optional(),
  precise_unit_amount: z.union([z.number(), z.null()]).optional(),
  amount_cents: z.union([z.number(), z.null()]).optional(),
  taxes_amount_cents: z.union([z.number(), z.null()]).optional()
});

export type CreateInvoiceFee = z.infer<typeof CreateInvoiceFee>;

export const CreateInvoice = z.object({
  type: z.union([z.literal("ACCPAY"), z.literal("ACCREC")]),
  external_contact_id: z.string(),
  url: z.string().optional(),
  fees: CreateInvoiceFee.array(),
  issuing_date: z.date().optional(),
  payment_due_date: z.union([z.date(), z.null()]).optional(),
  status: z.string().optional(),
  number: z.string().optional(),
  currency: z.string().optional(),
  purchase_order: z.union([z.string(), z.null()]).optional()
});

export type CreateInvoice = z.infer<typeof CreateInvoice>;

export const InvoiceFee = z.object({
  account_code: z.string().optional(),
  item_code: z.union([z.string(), z.null()]).optional(),
  account_external_id: z.union([z.string(), z.null()]).optional(),
  discount_amount_cents: z.union([z.number(), z.null()]).optional(),
  discount_rate: z.union([z.number(), z.null()]).optional(),
  item_id: z.string(),
  description: z.union([z.string(), z.null()]),
  units: z.union([z.number(), z.null()]),
  precise_unit_amount: z.union([z.number(), z.null()]),
  amount_cents: z.union([z.number(), z.null()]),
  taxes_amount_cents: z.union([z.number(), z.null()])
});

export type InvoiceFee = z.infer<typeof InvoiceFee>;

export const Invoice = z.object({
  type: z.union([z.literal("ACCPAY"), z.literal("ACCREC")]),
  external_contact_id: z.string(),
  url: z.string().optional(),
  id: z.string(),
  issuing_date: z.union([z.string(), z.null()]),
  payment_due_date: z.union([z.string(), z.null()]),
  status: z.string(),
  number: z.string().optional(),
  currency: z.string(),
  purchase_order: z.union([z.string(), z.null()]),
  fees: InvoiceFee.array()
});

export type Invoice = z.infer<typeof Invoice>;

export const UpdateInvoiceFee = z.object({
  account_code: z.string().optional(),
  item_code: z.union([z.string(), z.null()]).optional(),
  account_external_id: z.union([z.string(), z.null()]).optional(),
  discount_amount_cents: z.union([z.number(), z.null()]).optional(),
  discount_rate: z.union([z.number(), z.null()]).optional(),
  item_id: z.string().optional(),
  description: z.union([z.string(), z.null()]).optional(),
  units: z.union([z.number(), z.null()]).optional(),
  precise_unit_amount: z.union([z.number(), z.null()]).optional(),
  amount_cents: z.union([z.number(), z.null()]).optional(),
  taxes_amount_cents: z.union([z.number(), z.null()]).optional()
});

export type UpdateInvoiceFee = z.infer<typeof UpdateInvoiceFee>;

export const UpdateInvoice = z.object({
  type: z.union([z.literal("ACCPAY"), z.literal("ACCREC")]).optional(),
  external_contact_id: z.string().optional(),
  url: z.string().optional(),
  id: z.string(),
  issuing_date: z.union([z.string(), z.null()]).optional(),
  payment_due_date: z.union([z.string(), z.null()]).optional(),
  status: z.string().optional(),
  number: z.string().optional(),
  currency: z.string().optional(),
  purchase_order: z.union([z.string(), z.null()]).optional(),
  fees: UpdateInvoiceFee.array()
});

export type UpdateInvoice = z.infer<typeof UpdateInvoice>;

export const FailedInvoice = z.object({
  type: z.union([z.literal("ACCPAY"), z.literal("ACCREC")]),
  external_contact_id: z.string(),
  url: z.string().optional(),
  id: z.string(),
  issuing_date: z.union([z.string(), z.null()]),
  payment_due_date: z.union([z.string(), z.null()]),
  status: z.string(),
  number: z.string().optional(),
  currency: z.string(),
  purchase_order: z.union([z.string(), z.null()]),
  fees: InvoiceFee.array(),
  validation_errors: z.any().array()
});

export type FailedInvoice = z.infer<typeof FailedInvoice>;

export const InvoiceActionResponse = z.object({
  succeededInvoices: Invoice.array(),
  failedInvoices: FailedInvoice.array()
});

export type InvoiceActionResponse = z.infer<typeof InvoiceActionResponse>;

export const CreditNoteFee = z.object({
  item_id: z.string(),
  item_code: z.union([z.string(), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  units: z.union([z.number(), z.null()]).optional(),
  precise_unit_amount: z.union([z.number(), z.null()]).optional(),
  account_code: z.union([z.string(), z.null()]).optional(),
  account_external_id: z.union([z.string(), z.null()]).optional(),
  amount_cents: z.union([z.number(), z.null()]).optional(),
  taxes_amount_cents: z.union([z.number(), z.null()]).optional()
});

export type CreditNoteFee = z.infer<typeof CreditNoteFee>;

export const CreditNote = z.object({
  id: z.string(),
  type: z.string(),
  external_contact_id: z.string(),
  status: z.string(),
  number: z.string(),
  is_taxable: z.boolean().optional(),
  tax_rate_id: z.string().optional(),
  tax_rate: z.number().optional(),
  currency: z.string(),
  reference: z.string(),
  issuing_date: z.union([z.string(), z.null()]),
  fees: CreditNoteFee.array()
});

export type CreditNote = z.infer<typeof CreditNote>;

export const FailedCreditNote = z.object({
  id: z.string(),
  type: z.string(),
  external_contact_id: z.string(),
  status: z.string(),
  number: z.string(),
  is_taxable: z.boolean().optional(),
  tax_rate_id: z.string().optional(),
  tax_rate: z.number().optional(),
  currency: z.string(),
  reference: z.string(),
  issuing_date: z.union([z.string(), z.null()]),
  fees: CreditNoteFee.array(),
  validation_errors: z.any().array()
});

export type FailedCreditNote = z.infer<typeof FailedCreditNote>;

export const CreditNoteActionResponse = z.object({
  succeededCreditNotes: CreditNote.array(),
  failedCreditNotes: FailedCreditNote.array()
});

export type CreditNoteActionResponse = z.infer<typeof CreditNoteActionResponse>;

export const Tenant = z.object({
  id: z.string(),
  authEventId: z.string(),
  tenantId: z.string(),
  tenantType: z.string(),
  tenantName: z.string(),
  createdDateUtc: z.string(),
  updatedDateUtc: z.string()
});

export type Tenant = z.infer<typeof Tenant>;

export const TenantResponse = z.object({
  tenants: Tenant.array()
});

export type TenantResponse = z.infer<typeof TenantResponse>;

export const TrackingCategory = z.object({
  name: z.string(),
  option: z.string(),
  trackingCategoryId: z.string(),
  trackingOptionId: z.string(),
  options: z.string().array()
});

export type TrackingCategory = z.infer<typeof TrackingCategory>;

export const LedgerLine = z.object({
  journalLineId: z.string(),
  accountId: z.string(),
  accountCode: z.string(),
  accountName: z.string(),
  description: z.string().optional(),
  netAmount: z.number(),
  grossAmount: z.number(),
  taxAmount: z.number(),
  taxType: z.string().optional(),
  taxName: z.string().optional(),
  trackingCategories: TrackingCategory.array()
});

export type LedgerLine = z.infer<typeof LedgerLine>;

export const GeneralLedger = z.object({
  id: z.string(),
  date: z.union([z.string(), z.null()]),
  number: z.number(),
  reference: z.union([z.string(), z.null()]),
  sourceId: z.union([z.string(), z.null()]),
  sourceType: z.union([z.string(), z.null()]),
  createdDate: z.union([z.string(), z.null()]),
  lines: LedgerLine.array()
});

export type GeneralLedger = z.infer<typeof GeneralLedger>;

export const BankTransactionLineItem = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_amount: z.number(),
  account_code: z.string(),
  item_code: z.union([z.string(), z.null()]),
  line_item_id: z.string(),
  tax_type: z.union([z.string(), z.null()]),
  tax_amount: z.number(),
  line_amount: z.number(),
  tracking: z.union([TrackingCategory.array(), z.null()])
});

export type BankTransactionLineItem = z.infer<typeof BankTransactionLineItem>;

export const BankTransaction = z.object({
  id: z.string(),
  type: z.string(),
  bank_account_id: z.string(),
  bank_account_code: z.string(),
  bank_account_name: z.string(),
  contact_id: z.string(),
  contact_name: z.string(),
  date: z.union([z.string(), z.null()]),
  status: z.string(),
  reference: z.union([z.string(), z.null()]),
  is_reconciled: z.boolean(),
  currency_code: z.string(),
  currency_rate: z.union([z.number(), z.null()]),
  total: z.number(),
  sub_total: z.number(),
  total_tax: z.number(),
  line_amount_types: z.string(),
  line_items: BankTransactionLineItem.array(),
  updated_date: z.union([z.string(), z.null()]),
  url: z.union([z.string(), z.null()]),
  has_attachments: z.boolean()
});

export type BankTransaction = z.infer<typeof BankTransaction>;

export const Address = z.object({
  addressType: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  addressLine3: z.string().optional(),
  addressLine4: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  attentionTo: z.string().optional()
});

export type Address = z.infer<typeof Address>;

export const Phone = z.object({
  phoneType: z.string().optional(),
  phoneNumber: z.string().optional(),
  phoneAreaCode: z.string().optional(),
  phoneCountryCode: z.string().optional()
});

export type Phone = z.infer<typeof Phone>;

export const ExternalLink = z.object({
  linkType: z.string().optional(),
  url: z.string().optional()
});

export type ExternalLink = z.infer<typeof ExternalLink>;

export const PaymentTermDetails = z.object({
  day: z.number().optional(),
  type: z.string().optional()
});

export type PaymentTermDetails = z.infer<typeof PaymentTermDetails>;

export const PaymentTerms = z.object({
  bills: PaymentTermDetails,
  sales: PaymentTermDetails
});

export type PaymentTerms = z.infer<typeof PaymentTerms>;

export const Organisation = z.object({
  id: z.string(),
  apiKey: z.string().optional(),
  name: z.string(),
  legalName: z.string(),
  paysTax: z.boolean(),
  version: z.string(),
  organisationType: z.string(),
  baseCurrency: z.string(),
  countryCode: z.string(),
  isDemoCompany: z.boolean(),
  organisationStatus: z.string(),
  registrationNumber: z.string().optional(),
  employerIdentificationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  financialYearEndDay: z.number().optional(),
  financialYearEndMonth: z.number().optional(),
  salesTaxBasis: z.string().optional(),
  salesTaxPeriod: z.string().optional(),
  defaultSalesTax: z.string().optional(),
  defaultPurchasesTax: z.string().optional(),
  periodLockDate: z.string().optional(),
  endOfYearLockDate: z.string().optional(),
  createdDateUTC: z.string().optional(),
  timezone: z.string().optional(),
  organisationEntityType: z.string().optional(),
  shortCode: z.string().optional(),
  edition: z.string().optional(),
  "class": z.string().optional(),
  lineOfBusiness: z.string().optional(),
  addresses: Address.array(),
  phones: Phone.array(),
  externalLinks: ExternalLink.array(),
  paymentTerms: PaymentTerms
});

export type Organisation = z.infer<typeof Organisation>;
export const Anonymous_xero_action_createcontact_input = CreateContact.array();
export type Anonymous_xero_action_createcontact_input = z.infer<typeof Anonymous_xero_action_createcontact_input>;
export const Anonymous_xero_action_updatecontact_input = Contact.array();
export type Anonymous_xero_action_updatecontact_input = z.infer<typeof Anonymous_xero_action_updatecontact_input>;
export const Anonymous_xero_action_createinvoice_input = CreateInvoice.array();
export type Anonymous_xero_action_createinvoice_input = z.infer<typeof Anonymous_xero_action_createinvoice_input>;
export const Anonymous_xero_action_updateinvoice_input = UpdateInvoice.array();
export type Anonymous_xero_action_updateinvoice_input = z.infer<typeof Anonymous_xero_action_updateinvoice_input>;
export const Anonymous_xero_action_createcreditnote_input = CreditNote.array();
export type Anonymous_xero_action_createcreditnote_input = z.infer<typeof Anonymous_xero_action_createcreditnote_input>;
export const Anonymous_xero_action_updatecreditnote_input = CreditNote.array();
export type Anonymous_xero_action_updatecreditnote_input = z.infer<typeof Anonymous_xero_action_updatecreditnote_input>;
export const Anonymous_xero_action_createpayment_input = CreatePayment.array();
export type Anonymous_xero_action_createpayment_input = z.infer<typeof Anonymous_xero_action_createpayment_input>;
export const Anonymous_xero_action_createitem_input = Item.array();
export type Anonymous_xero_action_createitem_input = z.infer<typeof Anonymous_xero_action_createitem_input>;
export const Anonymous_xero_action_updateitem_input = Item.array();
export type Anonymous_xero_action_updateitem_input = z.infer<typeof Anonymous_xero_action_updateitem_input>;

export const models = {
  ActionErrorResponse: ActionErrorResponse,
  BaseContact: BaseContact,
  CreateContact: CreateContact,
  Contact: Contact,
  FailedContact: FailedContact,
  ContactActionResponse: ContactActionResponse,
  Account: Account,
  Item: Item,
  FailedItem: FailedItem,
  ItemActionResponse: ItemActionResponse,
  BasePayment: BasePayment,
  CreatePayment: CreatePayment,
  Payment: Payment,
  FailedPayment: FailedPayment,
  IdEntity: IdEntity,
  StatusOutput: StatusOutput,
  PaymentActionResponse: PaymentActionResponse,
  BaseInvoice: BaseInvoice,
  BaseInvoiceFee: BaseInvoiceFee,
  CreateInvoiceFee: CreateInvoiceFee,
  CreateInvoice: CreateInvoice,
  InvoiceFee: InvoiceFee,
  Invoice: Invoice,
  UpdateInvoiceFee: UpdateInvoiceFee,
  UpdateInvoice: UpdateInvoice,
  FailedInvoice: FailedInvoice,
  InvoiceActionResponse: InvoiceActionResponse,
  CreditNoteFee: CreditNoteFee,
  CreditNote: CreditNote,
  FailedCreditNote: FailedCreditNote,
  CreditNoteActionResponse: CreditNoteActionResponse,
  Tenant: Tenant,
  TenantResponse: TenantResponse,
  TrackingCategory: TrackingCategory,
  LedgerLine: LedgerLine,
  GeneralLedger: GeneralLedger,
  BankTransactionLineItem: BankTransactionLineItem,
  BankTransaction: BankTransaction,
  Address: Address,
  Phone: Phone,
  ExternalLink: ExternalLink,
  PaymentTermDetails: PaymentTermDetails,
  PaymentTerms: PaymentTerms,
  Organisation: Organisation,
  Anonymous_xero_action_createcontact_input: Anonymous_xero_action_createcontact_input,
  Anonymous_xero_action_updatecontact_input: Anonymous_xero_action_updatecontact_input,
  Anonymous_xero_action_createinvoice_input: Anonymous_xero_action_createinvoice_input,
  Anonymous_xero_action_updateinvoice_input: Anonymous_xero_action_updateinvoice_input,
  Anonymous_xero_action_createcreditnote_input: Anonymous_xero_action_createcreditnote_input,
  Anonymous_xero_action_updatecreditnote_input: Anonymous_xero_action_updatecreditnote_input,
  Anonymous_xero_action_createpayment_input: Anonymous_xero_action_createpayment_input,
  Anonymous_xero_action_createitem_input: Anonymous_xero_action_createitem_input,
  Anonymous_xero_action_updateitem_input: Anonymous_xero_action_updateitem_input
};