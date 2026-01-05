export interface SyncMetadata_quickbooks_accounts {
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

export interface SyncMetadata_quickbooks_billpayments {
};

export interface BillPayment {
  id: string;
  vendor_id?: string | undefined;
  vendor_name?: string | undefined;
  txn_date: string;
  total_amount: number;
  currency: string;
  private_note?: string | undefined;
  lines: ({  amount: number;
  linkedTxn: ({  txn_id: string;
  txn_type: string;})[];})[];
};

export interface SyncMetadata_quickbooks_bills {
};

export interface Bill {
  created_at: string;
  updated_at: string;
  id: string;
  sales_term_id?: string | undefined;
  due_date: string;
  balance: number;
  txn_date: string;
  currency: string;
  vendor_id: string;
  vendor_name?: string | undefined;
  ap_account_id?: string | undefined;
  ap_account_name?: string | undefined;
  total_amount: number;
  lines: ({  id: string;
  detail_type: string;
  amount: number;
  account_id?: string | undefined;
  account_name?: string | undefined;})[];
};

export interface SyncMetadata_quickbooks_creditmemos {
};

export interface CreditMemo {
  created_at: string;
  updated_at: string;
  id: string;
  txn_date: string;
  balance_cents: number;
  total_amt_cents: number;
  bill_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
  items: ({  id: string;
  description: string | null;
  qty: number;
  unit_price_cents: number;
  amount_cents: number;})[];
  remaining_credit: number;
  customer_name: string | null;
};

export interface SyncMetadata_quickbooks_customers {
};

export interface Customer {
  id: string;
  name: string;
  email: string;
  is_paying_customer: boolean;
  created_at: string;
  modified_at: string;
};

export interface SyncMetadata_quickbooks_deposits {
};

export interface Deposit {
  created_at: string;
  updated_at: string;
  id: string;
  account_id?: string | undefined;
  account_name?: string | undefined;
  txn_date: string;
  total_amount: number;
  currency: string;
  private_note?: string | undefined;
  lines: ({  id?: string | undefined;
  amount: number;
  detail_type?: string | undefined;
  deposit_account_id?: string | undefined;
  deposit_account_name?: string | undefined;})[];
};

export interface SyncMetadata_quickbooks_invoices {
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

export interface SyncMetadata_quickbooks_items {
};

export interface Item {
  id: string;
  item_code: string | null;
  name: string;
  description: string | null;
  account_code: string | null;
};

export interface SyncMetadata_quickbooks_journalentries {
};

export interface JournalEntry {
  created_at: string;
  updated_at: string;
  id: string;
  date: string | null;
  currency: string;
  note?: string | undefined;
  lines: ({  id: string;
  type: string;
  account_id: string;
  account_name: string;
  net_amount: number;
  posting_type: 'Debit' | 'Credit';
  description: string;
  entity_type?: string | undefined;
  entity_type_id?: string | undefined;
  entity_type_name?: string | undefined;
  department_id?: string | undefined;
  department_name?: string | undefined;
  class_id?: string | undefined;
  class_name?: string | undefined;})[];
};

export interface SyncMetadata_quickbooks_payments {
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

export interface SyncMetadata_quickbooks_purchases {
};

export interface Purchase {
  created_at: string;
  updated_at: string;
  id: string;
  account_id?: string | undefined;
  account_name?: string | undefined;
  payment_type: string;
  entity_type?: string | undefined;
  entity_id?: string | undefined;
  entity_name?: string | undefined;
  total_amount: number;
  print_status?: string | undefined;
  doc_number?: string | undefined;
  txn_date: string;
  currency: string;
  lines: ({  id: string;
  description?: string | undefined;
  detail_type: string;
  amount: number;
  account_name?: string | undefined;
  account_id?: string | undefined;
  billable_status?: string | undefined;
  tax_code?: string | undefined;})[];
};

export interface SyncMetadata_quickbooks_transfers {
};

export interface Transfer {
  created_at: string;
  updated_at: string;
  id: string;
  from_account_id?: string | undefined;
  from_account_name?: string | undefined;
  to_account_id?: string | undefined;
  to_account_name?: string | undefined;
  amount: number;
  currency: string;
  txn_date: string;
  private_note?: string | undefined;
};

export interface ActionInput_quickbooks_createaccount {
  name: string;
  account_type?: string | undefined;
  account_sub_type?: string | undefined;
  description?: string | undefined;
  acct_num?: string | undefined;
};

export interface ActionOutput_quickbooks_createaccount {
  created_at: string;
  updated_at: string;
  id: string;
  fully_qualified_name: string;
  name: string;
  account_type: string;
  account_sub_type: string;
  classification: string;
  current_balance_cents: number;
  active: boolean;
  description: string | null;
  acct_num: string | null;
  sub_account: boolean;
};

export interface ActionInput_quickbooks_createbill {
  currency: string;
  vendor_id: string;
  vendor_name?: string | undefined;
  line: ({  id: string;
  detail_type: string;
  amount: number;
  account_id?: string | undefined;
  account_name?: string | undefined;})[];
};

export interface ActionOutput_quickbooks_createbill {
  created_at: string;
  updated_at: string;
  id: string;
  sales_term_id?: string | undefined;
  due_date: string;
  balance: number;
  txn_date: string;
  currency: string;
  vendor_id: string;
  vendor_name?: string | undefined;
  ap_account_id?: string | undefined;
  ap_account_name?: string | undefined;
  total_amount: number;
  lines: ({  id: string;
  detail_type: string;
  amount: number;
  account_id?: string | undefined;
  account_name?: string | undefined;})[];
};

export interface ActionInput_quickbooks_createcreditmemo {
  customer_ref: {  name?: string | undefined;
  value: string;};
  line: ({  detail_type: string;
  amount_cents: number;
  sales_item_line_detail: {  item_ref: {  name?: string | undefined;
  value: string;};};
  quantity?: number | undefined;
  unit_price_cents?: number | undefined;
  discount_rate?: number | undefined;
  description?: string | undefined;})[];
  due_date?: string | undefined;
  currency_ref: {  name?: string | undefined;
  value: string;};
  project_ref: {  name?: string | undefined;
  value: string;};
};

export interface ActionOutput_quickbooks_createcreditmemo {
  created_at: string;
  updated_at: string;
  id: string;
  txn_date: string;
  balance_cents: number;
  total_amt_cents: number;
  bill_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
  items: ({  id: string;
  description: string | null;
  qty: number;
  unit_price_cents: number;
  amount_cents: number;})[];
  remaining_credit: number;
  customer_name: string | null;
};

export interface ActionInput_quickbooks_createcustomer {
  display_name?: string | undefined;
  suffix?: string | undefined;
  title?: string | undefined;
  given_name?: string | undefined;
  company_name?: string | undefined;
  notes?: string | undefined;
  primary_email?: string | undefined;
  primary_phone?: string | undefined;
  bill_address: {  line1?: string | undefined;
  line2?: string | undefined;
  city?: string | undefined;
  postal_code?: string | undefined;
  country?: string | undefined;
  lat?: string | undefined;
  long?: string | undefined;};
  ship_address: {  line1?: string | undefined;
  line2?: string | undefined;
  city?: string | undefined;
  postal_code?: string | undefined;
  country?: string | undefined;
  lat?: string | undefined;
  long?: string | undefined;};
};

export interface ActionOutput_quickbooks_createcustomer {
  created_at: string;
  updated_at: string;
  id: string;
  given_name: string | null;
  display_name: string | null;
  active: boolean;
  balance_cents: number;
  taxable: boolean;
  primary_email: string | null;
  primary_phone: string | null;
  bill_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
  ship_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
};

export interface ActionInput_quickbooks_createinvoice {
  customer_ref: {  name?: string | undefined;
  value: string;};
  line: ({  detail_type: string;
  amount_cents: number;
  sales_item_line_detail: {  item_ref: {  name?: string | undefined;
  value: string;};};
  quantity?: number | undefined;
  unit_price_cents?: number | undefined;
  discount_rate?: number | undefined;
  description?: string | undefined;})[];
  due_date?: string | undefined;
  currency_ref: {  name?: string | undefined;
  value: string;};
  project_ref: {  name?: string | undefined;
  value: string;};
};

export interface ActionOutput_quickbooks_createinvoice {
  created_at: string;
  updated_at: string;
  id: string;
  txn_date: string;
  balance_cents: number;
  total_amt_cents: number;
  bill_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
  items: ({  id: string;
  description: string | null;
  qty: number;
  unit_price_cents: number;
  amount_cents: number;})[];
  due_date: string;
  deposit_cents: number;
};

export interface ActionInput_quickbooks_createitem {
  track_qty_onHand?: boolean | undefined;
  qty_on_hand?: number | undefined;
  name: string;
  expense_accountRef: {  name?: string | undefined;
  value: string;};
  income_accountRef: {  name?: string | undefined;
  value: string;};
  asset_accountRef: {  name?: string | undefined;
  value: string;};
  inv_start_date?: string | undefined;
  unit_price_cents?: number | undefined;
  purchase_cost_cents?: number | undefined;
  type?: string | undefined;
};

export interface ActionOutput_quickbooks_createitem {
  created_at: string;
  updated_at: string;
  id: string;
  name: string;
  active: boolean;
  type: string;
  unit_price_cents: number;
  purchase_cost_cents: number;
  qty_on_hand: number | null;
  inv_start_date: string | null;
  description: string | null;
  track_qty_onHand: boolean;
};

export interface ActionInput_quickbooks_createjournalentry {
  line_items: ({  detail_type: string;
  amount: number;
  project_ref: {  name?: string | undefined;
  value: string;};
  description?: string | undefined;
  line_num?: number | undefined;
  journal_entry_line_detail: {  journal_code_ref: {  name?: string | undefined;
  value: string;};
  posting_type: 'Debit' | 'Credit';
  account_ref: {  name?: string | undefined;
  value: string;};
  tax_applicable_on?: string | undefined;
  entity?: {  type?: string | undefined;
  entity_ref: {  name?: string | undefined;
  value: string;};};
  tax_inclusive_amt?: number | undefined;
  class_ref: {  name?: string | undefined;
  value: string;};
  department_ref: {  name?: string | undefined;
  value: string;};
  tax_code_ref: {  name?: string | undefined;
  value: string;};
  billable_status?: string | undefined;
  tax_amount?: number | undefined;};})[];
  journal_code_ref: {  name?: string | undefined;
  value: string;};
  currency_ref: {  name?: string | undefined;
  value: string;};
};

export interface ActionOutput_quickbooks_createjournalentry {
  created_at: string;
  updated_at: string;
  id: string;
  date: string | null;
  currency: string;
  note?: string | undefined;
  lines: ({  id: string;
  type: string;
  account_id: string;
  account_name: string;
  net_amount: number;
  posting_type: 'Debit' | 'Credit';
  description: string;
  entity_type?: string | undefined;
  entity_type_id?: string | undefined;
  entity_type_name?: string | undefined;
  department_id?: string | undefined;
  department_name?: string | undefined;
  class_id?: string | undefined;
  class_name?: string | undefined;})[];
};

export interface ActionInput_quickbooks_createpayment {
  total_amount_cents: number;
  customer_ref: {  name?: string | undefined;
  value: string;};
  currency_ref: {  name?: string | undefined;
  value: string;};
  project_ref: {  name?: string | undefined;
  value: string;};
};

export interface ActionOutput_quickbooks_createpayment {
  created_at: string;
  updated_at: string;
  id: string;
  amount_cents: number;
  customer_name: string | null;
  txn_date: string;
};

export interface ActionInput_quickbooks_createpurchaseorder {
  ap_account_ref: {  name?: string | undefined;
  value: string;};
  vendor_ref: {  name?: string | undefined;
  value: string;};
  line: ({  id?: string | undefined;
  amount_cents: number;
  detail_type: 'ItemBasedExpenseLineDetail';
  item_based_expense_line_detail?: {  item_ref?: {  name?: string | undefined;
  value: string;};
  price_level_ref?: {  name?: string | undefined;
  value: string;};
  qty?: number | undefined;
  unit_price_cents?: number | undefined;
  tax_inclusive_amt?: number | undefined;
  customer_ref?: {  name?: string | undefined;
  value: string;};
  class_ref?: {  name?: string | undefined;
  value: string;};
  tax_code_ref?: {  name?: string | undefined;
  value: string;};
  markup_info?: {  price_level_ref?: {  name?: string | undefined;
  value: string;};
  percent?: number | undefined;
  mark_up_income_account_ref?: {  name?: string | undefined;
  value: string;};} | null;
  billable_status?: 'Billable' | 'NotBillable' | 'HasBeenBilled' | undefined;};
  description?: string | undefined;
  line_num?: number | undefined;
  linked_txn?: ({  txn_id: string;
  txn_type: string;
  txn_line_id?: string | undefined;})[];
  project_ref?: {  name?: string | undefined;
  value: string;};})[];
  sync_token?: string | undefined;
  currency_ref: {  name?: string | undefined;
  value: string;};
  global_tax_calculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable' | undefined;
  txn_date?: string | undefined;
  custom_field: ({  definition_id: string;
  name?: string | undefined;
  type?: string | undefined;
  string_value?: string | undefined;})[];
  po_email?: string | null | undefined;
  class_ref: {  name?: string | undefined;
  value: string;};
  sales_term_ref: {  name?: string | undefined;
  value: string;};
  linked_txn: ({  txn_id: string;
  txn_type: string;
  txn_line_id?: string | undefined;})[];
  memo?: string | undefined;
  po_status?: 'Open' | 'Closed' | undefined;
  transaction_location_type?: string | undefined;
  due_date?: string | undefined;
  metadata: {  created_at: string;
  updated_at: string;};
  doc_number?: string | undefined;
  private_note?: string | undefined;
  ship_method_ref: {  name?: string | undefined;
  value: string;};
  txn_tax_detail: {  txn_tax_code_ref: {  name?: string | undefined;
  value: string;};
  total_tax_cents?: number | undefined;
  tax_line?: ({  amount: number;
  detail_type: string;
  tax_line_detail: 'TaxLineDetail';})[] | undefined;};
  ship_to: {  name?: string | undefined;
  value: string;};
  exchange_rate?: number | undefined;
  ship_addr?: {  line1?: string | undefined;
  line2?: string | undefined;
  line3?: string | undefined;
  line4?: string | undefined;
  line5?: string | undefined;
  city?: string | undefined;
  sub_division_code?: string | undefined;
  postal_code?: string | undefined;
  country?: string | undefined;
  country_sub_division_code?: string | undefined;
  lat?: string | undefined;
  long?: string | undefined;
  id: string;} | null;
  vendor_addr?: {  line1?: string | undefined;
  line2?: string | undefined;
  line3?: string | undefined;
  line4?: string | undefined;
  line5?: string | undefined;
  city?: string | undefined;
  sub_division_code?: string | undefined;
  postal_code?: string | undefined;
  country?: string | undefined;
  country_sub_division_code?: string | undefined;
  lat?: string | undefined;
  long?: string | undefined;
  id: string;} | null;
  email_status?: string | undefined;
  total_amt_cents: number;
  recur_data_ref: {  name?: string | undefined;
  value: string;};
};

export interface ActionOutput_quickbooks_createpurchaseorder {
  id: string;
  created_at: string;
  updated_at: string;
  ap_account_ref: {  name?: string | undefined;
  value: string;};
  vendor_ref: {  name?: string | undefined;
  value: string;};
  line: ({  id?: string | undefined;
  amount_cents: number;
  detail_type: 'ItemBasedExpenseLineDetail';
  item_based_expense_line_detail?: {  item_ref?: {  name?: string | undefined;
  value: string;};
  price_level_ref?: {  name?: string | undefined;
  value: string;};
  qty?: number | undefined;
  unit_price_cents?: number | undefined;
  tax_inclusive_amt?: number | undefined;
  customer_ref?: {  name?: string | undefined;
  value: string;};
  class_ref?: {  name?: string | undefined;
  value: string;};
  tax_code_ref?: {  name?: string | undefined;
  value: string;};
  markup_info?: {  price_level_ref?: {  name?: string | undefined;
  value: string;};
  percent?: number | undefined;
  mark_up_income_account_ref?: {  name?: string | undefined;
  value: string;};} | null;
  billable_status?: 'Billable' | 'NotBillable' | 'HasBeenBilled' | undefined;};
  description?: string | undefined;
  line_num?: number | undefined;
  linked_txn?: ({  txn_id: string;
  txn_type: string;
  txn_line_id?: string | undefined;})[];
  project_ref?: {  name?: string | undefined;
  value: string;};})[];
  sync_token?: string | undefined;
  currency_ref?: {  name?: string | undefined;
  value: string;};
  global_tax_calculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable' | undefined;
  txn_date?: string | undefined;
  custom_field?: ({  definition_id: string;
  name?: string | undefined;
  type?: string | undefined;
  string_value?: string | undefined;})[];
  po_email?: string | null | undefined;
  class_ref?: {  name?: string | undefined;
  value: string;};
  sales_term_ref?: {  name?: string | undefined;
  value: string;};
  linked_txn?: ({  txn_id: string;
  txn_type: string;
  txn_line_id?: string | undefined;})[];
  memo?: string | undefined;
  po_status?: 'Open' | 'Closed' | undefined;
  transaction_location_type?: string | undefined;
  due_date?: string | undefined;
  metadata?: {  created_at: string;
  updated_at: string;} | undefined;
  doc_number?: string | undefined;
  private_note?: string | undefined;
  ship_method_ref?: {  name?: string | undefined;
  value: string;};
  txn_tax_detail?: {  txn_tax_code_ref: {  name?: string | undefined;
  value: string;};
  total_tax_cents?: number | undefined;
  tax_line?: ({  amount: number;
  detail_type: string;
  tax_line_detail: 'TaxLineDetail';})[] | undefined;};
  ship_to?: {  name?: string | undefined;
  value: string;};
  exchange_rate?: number | undefined;
  ship_addr?: {  line1?: string | undefined;
  line2?: string | undefined;
  line3?: string | undefined;
  line4?: string | undefined;
  line5?: string | undefined;
  city?: string | undefined;
  sub_division_code?: string | undefined;
  postal_code?: string | undefined;
  country?: string | undefined;
  country_sub_division_code?: string | undefined;
  lat?: string | undefined;
  long?: string | undefined;
  id: string;} | null;
  vendor_addr?: {  line1?: string | undefined;
  line2?: string | undefined;
  line3?: string | undefined;
  line4?: string | undefined;
  line5?: string | undefined;
  city?: string | undefined;
  sub_division_code?: string | undefined;
  postal_code?: string | undefined;
  country?: string | undefined;
  country_sub_division_code?: string | undefined;
  lat?: string | undefined;
  long?: string | undefined;
  id: string;} | null;
  email_status?: string | undefined;
  total_amt_cents: number;
  recur_data_ref?: {  name?: string | undefined;
  value: string;};
};

export interface ActionInput_quickbooks_updateaccount {
  name: string;
  account_type?: string | undefined;
  account_sub_type?: string | undefined;
  description?: string | undefined;
  acct_num?: string | undefined;
  id: string;
  sync_token: string;
  active?: boolean | undefined;
};

export interface ActionOutput_quickbooks_updateaccount {
  created_at: string;
  updated_at: string;
  id: string;
  fully_qualified_name: string;
  name: string;
  account_type: string;
  account_sub_type: string;
  classification: string;
  current_balance_cents: number;
  active: boolean;
  description: string | null;
  acct_num: string | null;
  sub_account: boolean;
};

export interface ActionInput_quickbooks_updatecreditmemo {
  customer_ref: {  name?: string | undefined;
  value: string;};
  line: ({  detail_type: string;
  amount_cents: number;
  sales_item_line_detail: {  item_ref: {  name?: string | undefined;
  value: string;};};
  quantity?: number | undefined;
  unit_price_cents?: number | undefined;
  discount_rate?: number | undefined;
  description?: string | undefined;})[];
  due_date?: string | undefined;
  currency_ref: {  name?: string | undefined;
  value: string;};
  project_ref: {  name?: string | undefined;
  value: string;};
  id: string;
  sync_token: string;
  active?: boolean | undefined;
};

export interface ActionOutput_quickbooks_updatecreditmemo {
  created_at: string;
  updated_at: string;
  id: string;
  txn_date: string;
  balance_cents: number;
  total_amt_cents: number;
  bill_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
  items: ({  id: string;
  description: string | null;
  qty: number;
  unit_price_cents: number;
  amount_cents: number;})[];
  remaining_credit: number;
  customer_name: string | null;
};

export interface ActionInput_quickbooks_updatecustomer {
  display_name?: string | undefined;
  suffix?: string | undefined;
  title?: string | undefined;
  given_name?: string | undefined;
  company_name?: string | undefined;
  notes?: string | undefined;
  primary_email?: string | undefined;
  primary_phone?: string | undefined;
  bill_address: {  line1?: string | undefined;
  line2?: string | undefined;
  city?: string | undefined;
  postal_code?: string | undefined;
  country?: string | undefined;
  lat?: string | undefined;
  long?: string | undefined;};
  ship_address: {  line1?: string | undefined;
  line2?: string | undefined;
  city?: string | undefined;
  postal_code?: string | undefined;
  country?: string | undefined;
  lat?: string | undefined;
  long?: string | undefined;};
  id: string;
  sync_token: string;
  active?: boolean | undefined;
};

export interface ActionOutput_quickbooks_updatecustomer {
  created_at: string;
  updated_at: string;
  id: string;
  given_name: string | null;
  display_name: string | null;
  active: boolean;
  balance_cents: number;
  taxable: boolean;
  primary_email: string | null;
  primary_phone: string | null;
  bill_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
  ship_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
};

export interface ActionInput_quickbooks_updateinvoice {
  customer_ref: {  name?: string | undefined;
  value: string;};
  line: ({  detail_type: string;
  amount_cents: number;
  sales_item_line_detail: {  item_ref: {  name?: string | undefined;
  value: string;};};
  quantity?: number | undefined;
  unit_price_cents?: number | undefined;
  discount_rate?: number | undefined;
  description?: string | undefined;})[];
  due_date?: string | undefined;
  currency_ref: {  name?: string | undefined;
  value: string;};
  project_ref: {  name?: string | undefined;
  value: string;};
  id: string;
  sync_token: string;
  active?: boolean | undefined;
};

export interface ActionOutput_quickbooks_updateinvoice {
  created_at: string;
  updated_at: string;
  id: string;
  txn_date: string;
  balance_cents: number;
  total_amt_cents: number;
  bill_address: {  city: string | null;
  line1: string | null;
  postal_code: string | null;
  country: string | null;
  id: string;} | null;
  items: ({  id: string;
  description: string | null;
  qty: number;
  unit_price_cents: number;
  amount_cents: number;})[];
  due_date: string;
  deposit_cents: number;
};

export interface ActionInput_quickbooks_updateitem {
  track_qty_onHand?: boolean | undefined;
  qty_on_hand?: number | undefined;
  name: string;
  expense_accountRef: {  name?: string | undefined;
  value: string;};
  income_accountRef: {  name?: string | undefined;
  value: string;};
  asset_accountRef: {  name?: string | undefined;
  value: string;};
  inv_start_date?: string | undefined;
  unit_price_cents?: number | undefined;
  purchase_cost_cents?: number | undefined;
  type?: string | undefined;
  id: string;
  sync_token: string;
  active?: boolean | undefined;
};

export interface ActionOutput_quickbooks_updateitem {
  created_at: string;
  updated_at: string;
  id: string;
  name: string;
  active: boolean;
  type: string;
  unit_price_cents: number;
  purchase_cost_cents: number;
  qty_on_hand: number | null;
  inv_start_date: string | null;
  description: string | null;
  track_qty_onHand: boolean;
};

export interface ActionInput_quickbooks_updatejournalentry {
  id: string;
  sync_token: string;
  sparse?: boolean | undefined;
  line_items: ({  id?: string | undefined;
  detail_type: string;
  amount?: number | undefined;
  project_ref: {  name?: string | undefined;
  value: string;};
  description?: string | undefined;
  line_num?: number | undefined;
  journal_entry_line_detail: {  journal_code_ref: {  name?: string | undefined;
  value: string;};
  posting_type: 'Debit' | 'Credit';
  account_ref: {  name?: string | undefined;
  value: string;};
  tax_applicable_on?: string | undefined;
  entity?: {  type?: string | undefined;
  entity_ref: {  name?: string | undefined;
  value: string;};};
  tax_inclusive_amt?: number | undefined;
  class_ref: {  name?: string | undefined;
  value: string;};
  department_ref: {  name?: string | undefined;
  value: string;};
  tax_code_ref: {  name?: string | undefined;
  value: string;};
  billable_status?: string | undefined;
  tax_amount?: number | undefined;};})[];
  currency_ref: {  name?: string | undefined;
  value: string;};
  global_tax_calculation?: string | undefined;
  doc_number?: string | undefined;
  private_note?: string | undefined;
  exchange_rate?: number | undefined;
  transaction_location_type?: string | undefined;
  txn_tax_detail?: {  txn_tax_code_ref: {  name?: string | undefined;
  value: string;};
  total_tax?: number | undefined;
  tax_line?: ({  detail_type: string;
  tax_line_detail?: {  tax_rate_ref: {  name?: string | undefined;
  value: string;};
  net_amount_taxable?: number | undefined;
  percent_based?: boolean | undefined;
  tax_percent?: number | undefined;};
  amount?: number | undefined;})[];};
  adjustment?: boolean | undefined;
};

export interface ActionOutput_quickbooks_updatejournalentry {
  created_at: string;
  updated_at: string;
  id: string;
  date: string | null;
  currency: string;
  note?: string | undefined;
  lines: ({  id: string;
  type: string;
  account_id: string;
  account_name: string;
  net_amount: number;
  posting_type: 'Debit' | 'Credit';
  description: string;
  entity_type?: string | undefined;
  entity_type_id?: string | undefined;
  entity_type_name?: string | undefined;
  department_id?: string | undefined;
  department_name?: string | undefined;
  class_id?: string | undefined;
  class_name?: string | undefined;})[];
};
