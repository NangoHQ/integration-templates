export interface Contact {
  name: string;
  id: string;
  external_id: string | null;
  email: string | null;
  tax_number: string | null;
  address_line_1?: string | null | undefined;
  address_line_2?: string | null | undefined;
  city: string | null;
  zip: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  subsidiary?: string | null | undefined;
};

export interface GeneralLedger {
  id: string;
  date: string | null;
  number: number;
  reference: string | null;
  sourceId: string | null;
  sourceType: string | null;
  createdDate: string | null;
  lines: ({  journalLineId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description?: string | undefined;
  netAmount: number;
  grossAmount: number;
  taxAmount: number;
  taxType?: string | undefined;
  taxName?: string | undefined;
  trackingCategories: ({  name: string;
  option: string;
  trackingCategoryId: string;
  trackingOptionId: string;
  options: string[];})[];})[];
};

export interface Account {
  id: string;
  code?: string | undefined;
  name: string;
  type: string;
  tax_type: string;
  description: string | null;
  class: string;
  bank_account_type: string;
  reporting_code: string;
  reporting_code_name: string;
  currency_code?: string | undefined;
};

export interface Invoice {
  type: 'ACCPAY' | 'ACCREC';
  external_contact_id: string;
  url?: string | undefined;
  id: string;
  issuing_date: string | null;
  payment_due_date: string | null;
  status: string;
  number?: string | undefined;
  currency: string;
  purchase_order: string | null;
  fees: ({  account_code?: string | undefined;
  item_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  discount_amount_cents?: number | null | undefined;
  discount_rate?: number | null | undefined;
  item_id: string;
  description: string | null;
  units: number | null;
  precise_unit_amount: number | null;
  amount_cents: number | null;
  taxes_amount_cents: number | null;})[];
};

export interface Item {
  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  account_code: string | null;
};

export interface Payment {
  date: string | null;
  amount_cents: number;
  external_contact_id?: string | undefined;
  account_code?: string | undefined;
  account_id?: string | undefined;
  id: string;
  status: string;
  invoice_id: string | null;
  credit_note_id: string | null;
};

export interface SyncMetadata_xero_accounts {
};

export interface SyncMetadata_xero_banktransactions {
};

export interface BankTransaction {
  id: string;
  type: string;
  bank_account_id: string;
  bank_account_code: string;
  bank_account_name: string;
  contact_id: string;
  contact_name: string;
  date: string | null;
  status: string;
  reference: string | null;
  is_reconciled: boolean;
  currency_code: string;
  currency_rate: number | null;
  total: number;
  sub_total: number;
  total_tax: number;
  line_amount_types: string;
  line_items: ({  description: string;
  quantity: number;
  unit_amount: number;
  account_code: string;
  item_code: string | null;
  line_item_id: string;
  tax_type: string | null;
  tax_amount: number;
  line_amount: number;
  tracking: ({  name: string;
  option: string;
  trackingCategoryId: string;
  trackingOptionId: string;
  options: string[];})[] | null;})[];
  updated_date: string | null;
  url: string | null;
  has_attachments: boolean;
};

export interface SyncMetadata_xero_contacts {
};

export interface SyncMetadata_xero_creditnotes {
};

export interface CreditNote {
  id: string;
  type: string;
  external_contact_id: string;
  status: string;
  number: string;
  is_taxable?: boolean | undefined;
  tax_rate_id?: string | undefined;
  tax_rate?: number | undefined;
  currency: string;
  reference: string;
  issuing_date: string | null;
  fees: ({  item_id: string;
  item_code?: string | null | undefined;
  description?: string | null | undefined;
  units?: number | null | undefined;
  precise_unit_amount?: number | null | undefined;
  account_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];
};

export interface SyncMetadata_xero_generalledger {
};

export interface SyncMetadata_xero_invoices {
};

export interface SyncMetadata_xero_items {
};

export interface SyncMetadata_xero_organisations {
};

export interface Organisation {
  id: string;
  apiKey?: string | undefined;
  name: string;
  legalName: string;
  paysTax: boolean;
  version: string;
  organisationType: string;
  baseCurrency: string;
  countryCode: string;
  isDemoCompany: boolean;
  organisationStatus: string;
  registrationNumber?: string | undefined;
  employerIdentificationNumber?: string | undefined;
  taxNumber?: string | undefined;
  financialYearEndDay?: number | undefined;
  financialYearEndMonth?: number | undefined;
  salesTaxBasis?: string | undefined;
  salesTaxPeriod?: string | undefined;
  defaultSalesTax?: string | undefined;
  defaultPurchasesTax?: string | undefined;
  periodLockDate?: string | undefined;
  endOfYearLockDate?: string | undefined;
  createdDateUTC?: string | undefined;
  timezone?: string | undefined;
  organisationEntityType?: string | undefined;
  shortCode?: string | undefined;
  edition?: string | undefined;
  class?: string | undefined;
  lineOfBusiness?: string | undefined;
  addresses: ({  addressType?: string | undefined;
  addressLine1?: string | undefined;
  addressLine2?: string | undefined;
  addressLine3?: string | undefined;
  addressLine4?: string | undefined;
  city?: string | undefined;
  region?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;
  attentionTo?: string | undefined;})[];
  phones: ({  phoneType?: string | undefined;
  phoneNumber?: string | undefined;
  phoneAreaCode?: string | undefined;
  phoneCountryCode?: string | undefined;})[];
  externalLinks: ({  linkType?: string | undefined;
  url?: string | undefined;})[];
  paymentTerms: {  bills: {  day?: number | undefined;
  type?: string | undefined;};
  sales: {  day?: number | undefined;
  type?: string | undefined;};};
};

export interface SyncMetadata_xero_payments {
};

export interface ActionInput_xero_createcontact {
  0: {  name: string;
  external_id?: string | undefined;
  email?: string | undefined;
  tax_number?: string | undefined;
  address_line_1?: string | undefined;
  address_line_2?: string | undefined;
  city?: string | undefined;
  zip?: string | undefined;
  country?: string | undefined;
  state?: string | undefined;
  phone?: string | undefined;};
};

export interface ActionOutput_xero_createcontact {
  succeededContacts: ({  name: string;
  id: string;
  external_id: string | null;
  email: string | null;
  tax_number: string | null;
  address_line_1?: string | null | undefined;
  address_line_2?: string | null | undefined;
  city: string | null;
  zip: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  subsidiary?: string | null | undefined;})[];
  failedContacts: ({  name: string;
  id: string;
  external_id: string | null;
  email: string | null;
  tax_number: string | null;
  address_line_1?: string | null | undefined;
  address_line_2?: string | null | undefined;
  city: string | null;
  zip: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  subsidiary?: string | null | undefined;
  validation_errors: any[];})[];
};

export interface ActionInput_xero_createcreditnote {
  0: {  id: string;
  type: string;
  external_contact_id: string;
  status: string;
  number: string;
  is_taxable?: boolean | undefined;
  tax_rate_id?: string | undefined;
  tax_rate?: number | undefined;
  currency: string;
  reference: string;
  issuing_date: string | null;
  fees: ({  item_id: string;
  item_code?: string | null | undefined;
  description?: string | null | undefined;
  units?: number | null | undefined;
  precise_unit_amount?: number | null | undefined;
  account_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];};
};

export interface ActionOutput_xero_createcreditnote {
  succeededCreditNotes: ({  id: string;
  type: string;
  external_contact_id: string;
  status: string;
  number: string;
  is_taxable?: boolean | undefined;
  tax_rate_id?: string | undefined;
  tax_rate?: number | undefined;
  currency: string;
  reference: string;
  issuing_date: string | null;
  fees: ({  item_id: string;
  item_code?: string | null | undefined;
  description?: string | null | undefined;
  units?: number | null | undefined;
  precise_unit_amount?: number | null | undefined;
  account_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];})[];
  failedCreditNotes: ({  id: string;
  type: string;
  external_contact_id: string;
  status: string;
  number: string;
  is_taxable?: boolean | undefined;
  tax_rate_id?: string | undefined;
  tax_rate?: number | undefined;
  currency: string;
  reference: string;
  issuing_date: string | null;
  fees: ({  item_id: string;
  item_code?: string | null | undefined;
  description?: string | null | undefined;
  units?: number | null | undefined;
  precise_unit_amount?: number | null | undefined;
  account_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];
  validation_errors: any[];})[];
};

export interface ActionInput_xero_createinvoice {
  0: {  type: 'ACCPAY' | 'ACCREC';
  external_contact_id: string;
  url?: string | undefined;
  fees: ({  account_code?: string | undefined;
  item_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  discount_amount_cents?: number | null | undefined;
  discount_rate?: number | null | undefined;
  item_id?: string | undefined;
  description: string;
  units?: number | undefined;
  precise_unit_amount?: number | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];
  issuing_date?: Date | undefined;
  payment_due_date?: Date | null | undefined;
  status?: string | undefined;
  number?: string | undefined;
  currency?: string | undefined;
  purchase_order?: string | null | undefined;};
};

export interface ActionOutput_xero_createinvoice {
  succeededInvoices: ({  type: 'ACCPAY' | 'ACCREC';
  external_contact_id: string;
  url?: string | undefined;
  id: string;
  issuing_date: string | null;
  payment_due_date: string | null;
  status: string;
  number?: string | undefined;
  currency: string;
  purchase_order: string | null;
  fees: ({  account_code?: string | undefined;
  item_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  discount_amount_cents?: number | null | undefined;
  discount_rate?: number | null | undefined;
  item_id: string;
  description: string | null;
  units: number | null;
  precise_unit_amount: number | null;
  amount_cents: number | null;
  taxes_amount_cents: number | null;})[];})[];
  failedInvoices: ({  type: 'ACCPAY' | 'ACCREC';
  external_contact_id: string;
  url?: string | undefined;
  id: string;
  issuing_date: string | null;
  payment_due_date: string | null;
  status: string;
  number?: string | undefined;
  currency: string;
  purchase_order: string | null;
  fees: ({  account_code?: string | undefined;
  item_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  discount_amount_cents?: number | null | undefined;
  discount_rate?: number | null | undefined;
  item_id: string;
  description: string | null;
  units: number | null;
  precise_unit_amount: number | null;
  amount_cents: number | null;
  taxes_amount_cents: number | null;})[];
  validation_errors: any[];})[];
};

export interface ActionInput_xero_createitem {
  0: {  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  account_code: string | null;};
};

export interface ActionOutput_xero_createitem {
  succeededItems: ({  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  account_code: string | null;})[];
  failedItems: ({  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  account_code: string | null;
  validation_errors: any[];})[];
};

export interface ActionInput_xero_createpayment {
  0: {  date: string | null;
  amount_cents: number;
  external_contact_id?: string | undefined;
  account_code?: string | undefined;
  account_id?: string | undefined;
  status?: string | undefined;
  invoice_id?: string | undefined;
  credit_note_id?: string | undefined;};
};

export interface ActionOutput_xero_createpayment {
  succeededPayment: ({  date: string | null;
  amount_cents: number;
  external_contact_id?: string | undefined;
  account_code?: string | undefined;
  account_id?: string | undefined;
  id: string;
  status: string;
  invoice_id: string | null;
  credit_note_id: string | null;})[];
  failedPayments: ({  date: string | null;
  amount_cents: number;
  external_contact_id?: string | undefined;
  account_code?: string | undefined;
  account_id?: string | undefined;
  id: string;
  status: string;
  invoice_id: string | null;
  credit_note_id: string | null;
  validation_errors: any[];})[];
};

export type ActionInput_xero_gettenants = void

export interface ActionOutput_xero_gettenants {
  tenants: ({  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;})[];
};

export interface ActionInput_xero_updatecontact {
  0: {  name: string;
  id: string;
  external_id: string | null;
  email: string | null;
  tax_number: string | null;
  address_line_1?: string | null | undefined;
  address_line_2?: string | null | undefined;
  city: string | null;
  zip: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  subsidiary?: string | null | undefined;};
};

export interface ActionOutput_xero_updatecontact {
  succeededContacts: ({  name: string;
  id: string;
  external_id: string | null;
  email: string | null;
  tax_number: string | null;
  address_line_1?: string | null | undefined;
  address_line_2?: string | null | undefined;
  city: string | null;
  zip: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  subsidiary?: string | null | undefined;})[];
  failedContacts: ({  name: string;
  id: string;
  external_id: string | null;
  email: string | null;
  tax_number: string | null;
  address_line_1?: string | null | undefined;
  address_line_2?: string | null | undefined;
  city: string | null;
  zip: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  subsidiary?: string | null | undefined;
  validation_errors: any[];})[];
};

export interface ActionInput_xero_updatecreditnote {
  0: {  id: string;
  type: string;
  external_contact_id: string;
  status: string;
  number: string;
  is_taxable?: boolean | undefined;
  tax_rate_id?: string | undefined;
  tax_rate?: number | undefined;
  currency: string;
  reference: string;
  issuing_date: string | null;
  fees: ({  item_id: string;
  item_code?: string | null | undefined;
  description?: string | null | undefined;
  units?: number | null | undefined;
  precise_unit_amount?: number | null | undefined;
  account_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];};
};

export interface ActionOutput_xero_updatecreditnote {
  succeededCreditNotes: ({  id: string;
  type: string;
  external_contact_id: string;
  status: string;
  number: string;
  is_taxable?: boolean | undefined;
  tax_rate_id?: string | undefined;
  tax_rate?: number | undefined;
  currency: string;
  reference: string;
  issuing_date: string | null;
  fees: ({  item_id: string;
  item_code?: string | null | undefined;
  description?: string | null | undefined;
  units?: number | null | undefined;
  precise_unit_amount?: number | null | undefined;
  account_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];})[];
  failedCreditNotes: ({  id: string;
  type: string;
  external_contact_id: string;
  status: string;
  number: string;
  is_taxable?: boolean | undefined;
  tax_rate_id?: string | undefined;
  tax_rate?: number | undefined;
  currency: string;
  reference: string;
  issuing_date: string | null;
  fees: ({  item_id: string;
  item_code?: string | null | undefined;
  description?: string | null | undefined;
  units?: number | null | undefined;
  precise_unit_amount?: number | null | undefined;
  account_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];
  validation_errors: any[];})[];
};

export interface ActionInput_xero_updateinvoice {
  0: {  type?: 'ACCPAY' | 'ACCREC' | undefined;
  external_contact_id?: string | undefined;
  url?: string | undefined;
  id: string;
  issuing_date?: string | null | undefined;
  payment_due_date?: string | null | undefined;
  status?: string | undefined;
  number?: string | undefined;
  currency?: string | undefined;
  purchase_order?: string | null | undefined;
  fees: ({  account_code?: string | undefined;
  item_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  discount_amount_cents?: number | null | undefined;
  discount_rate?: number | null | undefined;
  item_id?: string | undefined;
  description?: string | null | undefined;
  units?: number | null | undefined;
  precise_unit_amount?: number | null | undefined;
  amount_cents?: number | null | undefined;
  taxes_amount_cents?: number | null | undefined;})[];};
};

export interface ActionOutput_xero_updateinvoice {
  succeededInvoices: ({  type: 'ACCPAY' | 'ACCREC';
  external_contact_id: string;
  url?: string | undefined;
  id: string;
  issuing_date: string | null;
  payment_due_date: string | null;
  status: string;
  number?: string | undefined;
  currency: string;
  purchase_order: string | null;
  fees: ({  account_code?: string | undefined;
  item_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  discount_amount_cents?: number | null | undefined;
  discount_rate?: number | null | undefined;
  item_id: string;
  description: string | null;
  units: number | null;
  precise_unit_amount: number | null;
  amount_cents: number | null;
  taxes_amount_cents: number | null;})[];})[];
  failedInvoices: ({  type: 'ACCPAY' | 'ACCREC';
  external_contact_id: string;
  url?: string | undefined;
  id: string;
  issuing_date: string | null;
  payment_due_date: string | null;
  status: string;
  number?: string | undefined;
  currency: string;
  purchase_order: string | null;
  fees: ({  account_code?: string | undefined;
  item_code?: string | null | undefined;
  account_external_id?: string | null | undefined;
  discount_amount_cents?: number | null | undefined;
  discount_rate?: number | null | undefined;
  item_id: string;
  description: string | null;
  units: number | null;
  precise_unit_amount: number | null;
  amount_cents: number | null;
  taxes_amount_cents: number | null;})[];
  validation_errors: any[];})[];
};

export interface ActionInput_xero_updateitem {
  0: {  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  account_code: string | null;};
};

export interface ActionOutput_xero_updateitem {
  succeededItems: ({  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  account_code: string | null;})[];
  failedItems: ({  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  account_code: string | null;
  validation_errors: any[];})[];
};
