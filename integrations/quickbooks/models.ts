import { z } from "zod";

export const Updates = z.object({
  id: z.string(),
  sync_token: z.string(),
  active: z.boolean().optional()
});

export type Updates = z.infer<typeof Updates>;

export const Metadata = z.object({
  created_at: z.string(),
  updated_at: z.string()
});

export type Metadata = z.infer<typeof Metadata>;

export const BillAddr = z.object({
  city: z.union([z.string(), z.null()]),
  line1: z.union([z.string(), z.null()]),
  postal_code: z.union([z.string(), z.null()]),
  country: z.union([z.string(), z.null()]),
  id: z.string()
});

export type BillAddr = z.infer<typeof BillAddr>;

export const InvoiceItem = z.object({
  id: z.string(),
  description: z.union([z.string(), z.null()]),
  qty: z.number(),
  unit_price_cents: z.number(),
  amount_cents: z.number()
});

export type InvoiceItem = z.infer<typeof InvoiceItem>;

export const BaseInvoice = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  txn_date: z.string(),
  balance_cents: z.number(),
  total_amt_cents: z.number(),
  bill_address: z.union([BillAddr, z.null()]),
  items: InvoiceItem.array()
});

export type BaseInvoice = z.infer<typeof BaseInvoice>;

export const Reference = z.object({
  name: z.string().optional(),
  value: z.string()
});

export type Reference = z.infer<typeof Reference>;

export const Customer = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  given_name: z.union([z.string(), z.null()]),
  display_name: z.union([z.string(), z.null()]),
  active: z.boolean(),
  balance_cents: z.number(),
  taxable: z.boolean(),
  primary_email: z.union([z.string(), z.null()]),
  primary_phone: z.union([z.string(), z.null()]),
  bill_address: z.union([BillAddr, z.null()]),
  ship_address: z.union([BillAddr, z.null()])
});

export type Customer = z.infer<typeof Customer>;

export const Account = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  fully_qualified_name: z.string(),
  name: z.string(),
  account_type: z.string(),
  account_sub_type: z.string(),
  classification: z.string(),
  current_balance_cents: z.number(),
  active: z.boolean(),
  description: z.union([z.string(), z.null()]),
  acct_num: z.union([z.string(), z.null()]),
  sub_account: z.boolean()
});

export type Account = z.infer<typeof Account>;

export const Payment = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  amount_cents: z.number(),
  customer_name: z.union([z.string(), z.null()]),
  txn_date: z.string()
});

export type Payment = z.infer<typeof Payment>;

export const Item = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  type: z.string(),
  unit_price_cents: z.number(),
  purchase_cost_cents: z.number(),
  qty_on_hand: z.union([z.number(), z.null()]),
  inv_start_date: z.union([z.string(), z.null()]),
  description: z.union([z.string(), z.null()]),
  track_qty_onHand: z.boolean()
});

export type Item = z.infer<typeof Item>;

export const Invoice = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  txn_date: z.string(),
  balance_cents: z.number(),
  total_amt_cents: z.number(),
  bill_address: z.union([BillAddr, z.null()]),
  items: InvoiceItem.array(),
  due_date: z.string(),
  deposit_cents: z.number()
});

export type Invoice = z.infer<typeof Invoice>;

export const Address = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  lat: z.string().optional(),
  "long": z.string().optional()
});

export type Address = z.infer<typeof Address>;

export const CreateCustomer = z.object({
  display_name: z.string().optional(),
  suffix: z.string().optional(),
  title: z.string().optional(),
  given_name: z.string().optional(),
  company_name: z.string().optional(),
  notes: z.string().optional(),
  primary_email: z.string().optional(),
  primary_phone: z.string().optional(),
  bill_address: Address,
  ship_address: Address
});

export type CreateCustomer = z.infer<typeof CreateCustomer>;

export const UpdateCustomer = z.object({
  display_name: z.string().optional(),
  suffix: z.string().optional(),
  title: z.string().optional(),
  given_name: z.string().optional(),
  company_name: z.string().optional(),
  notes: z.string().optional(),
  primary_email: z.string().optional(),
  primary_phone: z.string().optional(),
  bill_address: Address,
  ship_address: Address,
  id: z.string(),
  sync_token: z.string(),
  active: z.boolean().optional()
});

export type UpdateCustomer = z.infer<typeof UpdateCustomer>;

export const CreateItem = z.object({
  track_qty_onHand: z.boolean().optional(),
  qty_on_hand: z.number().optional(),
  name: z.string(),
  expense_accountRef: Reference,
  income_accountRef: Reference,
  asset_accountRef: Reference,
  inv_start_date: z.string().optional(),
  unit_price_cents: z.number().optional(),
  purchase_cost_cents: z.number().optional(),
  type: z.string().optional()
});

export type CreateItem = z.infer<typeof CreateItem>;

export const UpdateItem = z.object({
  track_qty_onHand: z.boolean().optional(),
  qty_on_hand: z.number().optional(),
  name: z.string(),
  expense_accountRef: Reference,
  income_accountRef: Reference,
  asset_accountRef: Reference,
  inv_start_date: z.string().optional(),
  unit_price_cents: z.number().optional(),
  purchase_cost_cents: z.number().optional(),
  type: z.string().optional(),
  id: z.string(),
  sync_token: z.string(),
  active: z.boolean().optional()
});

export type UpdateItem = z.infer<typeof UpdateItem>;

export const CreateAccount = z.object({
  name: z.string(),
  account_type: z.string().optional(),
  account_sub_type: z.string().optional(),
  description: z.string().optional(),
  acct_num: z.string().optional()
});

export type CreateAccount = z.infer<typeof CreateAccount>;

export const UpdateAccount = z.object({
  name: z.string(),
  account_type: z.string().optional(),
  account_sub_type: z.string().optional(),
  description: z.string().optional(),
  acct_num: z.string().optional(),
  id: z.string(),
  sync_token: z.string(),
  active: z.boolean().optional()
});

export type UpdateAccount = z.infer<typeof UpdateAccount>;

export const Line = z.object({
  detail_type: z.string(),
  amount_cents: z.number(),

  sales_item_line_detail: z.object({
    item_ref: Reference
  }),

  quantity: z.number().optional(),
  unit_price_cents: z.number().optional(),
  discount_rate: z.number().optional(),
  description: z.string().optional()
});

export type Line = z.infer<typeof Line>;

export const CreateInvoice = z.object({
  customer_ref: Reference,
  line: Line.array(),
  due_date: z.string().optional(),
  currency_ref: Reference,
  project_ref: Reference
});

export type CreateInvoice = z.infer<typeof CreateInvoice>;

export const UpdateInvoice = z.object({
  customer_ref: Reference,
  line: Line.array(),
  due_date: z.string().optional(),
  currency_ref: Reference,
  project_ref: Reference,
  id: z.string(),
  sync_token: z.string(),
  active: z.boolean().optional()
});

export type UpdateInvoice = z.infer<typeof UpdateInvoice>;

export const CreateCreditMemo = z.object({
  customer_ref: Reference,
  line: Line.array(),
  due_date: z.string().optional(),
  currency_ref: Reference,
  project_ref: Reference
});

export type CreateCreditMemo = z.infer<typeof CreateCreditMemo>;

export const UpdateCreditMemo = z.object({
  customer_ref: Reference,
  line: Line.array(),
  due_date: z.string().optional(),
  currency_ref: Reference,
  project_ref: Reference,
  id: z.string(),
  sync_token: z.string(),
  active: z.boolean().optional()
});

export type UpdateCreditMemo = z.infer<typeof UpdateCreditMemo>;

export const CreditMemo = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  txn_date: z.string(),
  balance_cents: z.number(),
  total_amt_cents: z.number(),
  bill_address: z.union([BillAddr, z.null()]),
  items: InvoiceItem.array(),
  remaining_credit: z.number(),
  customer_name: z.union([z.string(), z.null()])
});

export type CreditMemo = z.infer<typeof CreditMemo>;

export const CreatePayment = z.object({
  total_amount_cents: z.number(),
  customer_ref: Reference,
  currency_ref: Reference,
  project_ref: Reference
});

export type CreatePayment = z.infer<typeof CreatePayment>;

export const JournalEntryLine = z.object({
  id: z.string(),
  type: z.string(),
  account_id: z.string(),
  account_name: z.string(),
  net_amount: z.number(),
  posting_type: z.union([z.literal("Debit"), z.literal("Credit")]),
  description: z.string(),
  entity_type: z.string().optional(),
  entity_type_id: z.string().optional(),
  entity_type_name: z.string().optional(),
  department_id: z.string().optional(),
  department_name: z.string().optional(),
  class_id: z.string().optional(),
  class_name: z.string().optional()
});

export type JournalEntryLine = z.infer<typeof JournalEntryLine>;

export const JournalEntry = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  date: z.union([z.string(), z.null()]),
  currency: z.string(),
  note: z.string().optional(),
  lines: JournalEntryLine.array()
});

export type JournalEntry = z.infer<typeof JournalEntry>;

export const BillLine = z.object({
  id: z.string(),
  detail_type: z.string(),
  amount: z.number(),
  account_id: z.string().optional(),
  account_name: z.string().optional()
});

export type BillLine = z.infer<typeof BillLine>;

export const Bill = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  sales_term_id: z.string().optional(),
  due_date: z.string(),
  balance: z.number(),
  txn_date: z.string(),
  currency: z.string(),
  vendor_id: z.string(),
  vendor_name: z.string().optional(),
  ap_account_id: z.string().optional(),
  ap_account_name: z.string().optional(),
  total_amount: z.number(),
  lines: BillLine.array()
});

export type Bill = z.infer<typeof Bill>;

export const CreateBill = z.object({
  currency: z.string(),
  vendor_id: z.string(),
  vendor_name: z.string().optional(),
  line: BillLine.array()
});

export type CreateBill = z.infer<typeof CreateBill>;

export const BillPaymentLinkedTxn = z.object({
  txn_id: z.string(),
  txn_type: z.string()
});

export type BillPaymentLinkedTxn = z.infer<typeof BillPaymentLinkedTxn>;

export const BillPaymentLine = z.object({
  amount: z.number(),
  linkedTxn: BillPaymentLinkedTxn.array()
});

export type BillPaymentLine = z.infer<typeof BillPaymentLine>;

export const BillPayment = z.object({
  id: z.string(),
  vendor_id: z.string().optional(),
  vendor_name: z.string().optional(),
  txn_date: z.string(),
  total_amount: z.number(),
  currency: z.string(),
  private_note: z.string().optional(),
  lines: BillPaymentLine.array()
});

export type BillPayment = z.infer<typeof BillPayment>;

export const PurchaseLine = z.object({
  id: z.string(),
  description: z.string().optional(),
  detail_type: z.string(),
  amount: z.number(),
  account_name: z.string().optional(),
  account_id: z.string().optional(),
  billable_status: z.string().optional(),
  tax_code: z.string().optional()
});

export type PurchaseLine = z.infer<typeof PurchaseLine>;

export const Purchase = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  account_id: z.string().optional(),
  account_name: z.string().optional(),
  payment_type: z.string(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  entity_name: z.string().optional(),
  total_amount: z.number(),
  print_status: z.string().optional(),
  doc_number: z.string().optional(),
  txn_date: z.string(),
  currency: z.string(),
  lines: PurchaseLine.array()
});

export type Purchase = z.infer<typeof Purchase>;

export const Transfer = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  from_account_id: z.string().optional(),
  from_account_name: z.string().optional(),
  to_account_id: z.string().optional(),
  to_account_name: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  txn_date: z.string(),
  private_note: z.string().optional()
});

export type Transfer = z.infer<typeof Transfer>;

export const DepositLine = z.object({
  id: z.string().optional(),
  amount: z.number(),
  detail_type: z.string().optional(),
  deposit_account_id: z.string().optional(),
  deposit_account_name: z.string().optional()
});

export type DepositLine = z.infer<typeof DepositLine>;

export const Deposit = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  account_id: z.string().optional(),
  account_name: z.string().optional(),
  txn_date: z.string(),
  total_amount: z.number(),
  currency: z.string(),
  private_note: z.string().optional(),
  lines: DepositLine.array()
});

export type Deposit = z.infer<typeof Deposit>;

export const DeleteResponse = z.object({
  id: z.string()
});

export type DeleteResponse = z.infer<typeof DeleteResponse>;

export const LinkedTxn = z.object({
  txn_id: z.string(),
  txn_type: z.string(),
  txn_line_id: z.string().optional()
});

export type LinkedTxn = z.infer<typeof LinkedTxn>;

export const MarkupInfo = z.object({
  price_level_ref: Reference.optional(),
  percent: z.number().optional(),
  mark_up_income_account_ref: Reference.optional()
});

export type MarkupInfo = z.infer<typeof MarkupInfo>;

export const ItemBasedExpenseLine = z.object({
  item_ref: Reference.optional(),
  price_level_ref: Reference.optional(),
  qty: z.number().optional(),
  unit_price_cents: z.number().optional(),
  tax_inclusive_amt: z.number().optional(),
  customer_ref: Reference.optional(),
  class_ref: Reference.optional(),
  tax_code_ref: Reference.optional(),
  markup_info: z.union([MarkupInfo, z.null()]).optional(),

  billable_status: z.union([
    z.literal("Billable"),
    z.literal("NotBillable"),
    z.literal("HasBeenBilled")
  ]).optional()
});

export type ItemBasedExpenseLine = z.infer<typeof ItemBasedExpenseLine>;

export const PurchaseOrderLine = z.object({
  id: z.string().optional(),
  amount_cents: z.number(),
  detail_type: z.literal("ItemBasedExpenseLineDetail"),
  item_based_expense_line_detail: ItemBasedExpenseLine.optional(),
  description: z.string().optional(),
  line_num: z.number().optional(),
  linked_txn: LinkedTxn.array().optional(),
  project_ref: Reference.optional()
});

export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLine>;

export const CustomField = z.object({
  definition_id: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  string_value: z.string().optional()
});

export type CustomField = z.infer<typeof CustomField>;

export const TaxLine = z.object({
  amount: z.number(),
  detail_type: z.string(),
  tax_line_detail: z.literal("TaxLineDetail")
});

export type TaxLine = z.infer<typeof TaxLine>;

export const TxnTaxDetail = z.object({
  txn_tax_code_ref: Reference,
  total_tax_cents: z.number().optional(),
  tax_line: TaxLine.array().optional()
});

export type TxnTaxDetail = z.infer<typeof TxnTaxDetail>;

export const PhysicalAddress = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  line3: z.string().optional(),
  line4: z.string().optional(),
  line5: z.string().optional(),
  city: z.string().optional(),
  sub_division_code: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  country_sub_division_code: z.string().optional(),
  lat: z.string().optional(),
  "long": z.string().optional(),
  id: z.string()
});

export type PhysicalAddress = z.infer<typeof PhysicalAddress>;

export const CreatePurchaseOrder = z.object({
  ap_account_ref: Reference,
  vendor_ref: Reference,
  line: PurchaseOrderLine.array(),
  sync_token: z.string().optional(),
  currency_ref: Reference,

  global_tax_calculation: z.union([
    z.literal("TaxExcluded"),
    z.literal("TaxInclusive"),
    z.literal("NotApplicable")
  ]).optional(),

  txn_date: z.string().optional(),
  custom_field: CustomField.array(),
  po_email: z.union([z.string(), z.null()]).optional(),
  class_ref: Reference,
  sales_term_ref: Reference,
  linked_txn: LinkedTxn.array(),
  memo: z.string().optional(),
  po_status: z.union([z.literal("Open"), z.literal("Closed")]).optional(),
  transaction_location_type: z.string().optional(),
  due_date: z.string().optional(),
  metadata: Metadata,
  doc_number: z.string().optional(),
  private_note: z.string().optional(),
  ship_method_ref: Reference,
  txn_tax_detail: TxnTaxDetail,
  ship_to: Reference,
  exchange_rate: z.number().optional(),
  ship_addr: z.union([PhysicalAddress, z.null()]).optional(),
  vendor_addr: z.union([PhysicalAddress, z.null()]).optional(),
  email_status: z.string().optional(),
  total_amt_cents: z.number(),
  recur_data_ref: Reference
});

export type CreatePurchaseOrder = z.infer<typeof CreatePurchaseOrder>;

export const PurchaseOrder = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  ap_account_ref: Reference,
  vendor_ref: Reference,
  line: PurchaseOrderLine.array(),
  sync_token: z.string().optional(),
  currency_ref: Reference.optional(),

  global_tax_calculation: z.union([
    z.literal("TaxExcluded"),
    z.literal("TaxInclusive"),
    z.literal("NotApplicable")
  ]).optional(),

  txn_date: z.string().optional(),
  custom_field: CustomField.array().optional(),
  po_email: z.union([z.string(), z.null()]).optional(),
  class_ref: Reference.optional(),
  sales_term_ref: Reference.optional(),
  linked_txn: LinkedTxn.array().optional(),
  memo: z.string().optional(),
  po_status: z.union([z.literal("Open"), z.literal("Closed")]).optional(),
  transaction_location_type: z.string().optional(),
  due_date: z.string().optional(),
  metadata: Metadata.optional(),
  doc_number: z.string().optional(),
  private_note: z.string().optional(),
  ship_method_ref: Reference.optional(),
  txn_tax_detail: TxnTaxDetail.optional(),
  ship_to: Reference.optional(),
  exchange_rate: z.number().optional(),
  ship_addr: z.union([PhysicalAddress, z.null()]).optional(),
  vendor_addr: z.union([PhysicalAddress, z.null()]).optional(),
  email_status: z.string().optional(),
  total_amt_cents: z.number(),
  recur_data_ref: Reference.optional()
});

export type PurchaseOrder = z.infer<typeof PurchaseOrder>;

export const AccountBasedExpenseLineDetail = z.object({
  account_ref: Reference,
  tax_amount: z.number().optional(),
  tax_inclusive_amt: z.number().optional(),
  customer_ref: Reference,
  class_ref: Reference,
  tax_code_ref: Reference,
  markup_info: z.union([MarkupInfo, z.null()]).optional(),

  billable_status: z.union([
    z.literal("Billable"),
    z.literal("NotBillable"),
    z.literal("HasBeenBilled")
  ]).optional()
});

export type AccountBasedExpenseLineDetail = z.infer<typeof AccountBasedExpenseLineDetail>;

export const CreateJournalEntry = z.object({
  line_items: z.array(z.object({
    detail_type: z.string(),
    amount: z.number(),
    project_ref: Reference,
    description: z.string().optional(),
    line_num: z.number().optional(),

    journal_entry_line_detail: z.object({
      journal_code_ref: Reference,
      posting_type: z.union([z.literal("Debit"), z.literal("Credit")]),
      account_ref: Reference,
      tax_applicable_on: z.string().optional(),

      entity: z.object({
        type: z.string().optional(),
        entity_ref: Reference
      }).optional(),

      tax_inclusive_amt: z.number().optional(),
      class_ref: Reference,
      department_ref: Reference,
      tax_code_ref: Reference,
      billable_status: z.string().optional(),
      tax_amount: z.number().optional()
    })
  })),

  journal_code_ref: Reference,
  currency_ref: Reference
});

export type CreateJournalEntry = z.infer<typeof CreateJournalEntry>;

export const UpdateJournalEntry = z.object({
  id: z.string(),
  sync_token: z.string(),
  sparse: z.boolean().optional(),

  line_items: z.array(z.object({
    id: z.string().optional(),
    detail_type: z.string(),
    amount: z.number().optional(),
    project_ref: Reference,
    description: z.string().optional(),
    line_num: z.number().optional(),

    journal_entry_line_detail: z.object({
      journal_code_ref: Reference,
      posting_type: z.union([z.literal("Debit"), z.literal("Credit")]),
      account_ref: Reference,
      tax_applicable_on: z.string().optional(),

      entity: z.object({
        type: z.string().optional(),
        entity_ref: Reference
      }).optional(),

      tax_inclusive_amt: z.number().optional(),
      class_ref: Reference,
      department_ref: Reference,
      tax_code_ref: Reference,
      billable_status: z.string().optional(),
      tax_amount: z.number().optional()
    })
  })),

  currency_ref: Reference,
  global_tax_calculation: z.string().optional(),
  doc_number: z.string().optional(),
  private_note: z.string().optional(),
  exchange_rate: z.number().optional(),
  transaction_location_type: z.string().optional(),

  txn_tax_detail: z.object({
    txn_tax_code_ref: Reference,
    total_tax: z.number().optional(),

    tax_line: z.array(z.object({
      detail_type: z.string(),

      tax_line_detail: z.object({
        tax_rate_ref: Reference,
        net_amount_taxable: z.number().optional(),
        percent_based: z.boolean().optional(),
        tax_percent: z.number().optional()
      }).optional(),

      amount: z.number().optional()
    })).optional()
  }).optional(),

  adjustment: z.boolean().optional()
});

export type UpdateJournalEntry = z.infer<typeof UpdateJournalEntry>;

export const models = {
  Updates: Updates,
  Metadata: Metadata,
  BillAddr: BillAddr,
  InvoiceItem: InvoiceItem,
  BaseInvoice: BaseInvoice,
  Reference: Reference,
  Customer: Customer,
  Account: Account,
  Payment: Payment,
  Item: Item,
  Invoice: Invoice,
  Address: Address,
  CreateCustomer: CreateCustomer,
  UpdateCustomer: UpdateCustomer,
  CreateItem: CreateItem,
  UpdateItem: UpdateItem,
  CreateAccount: CreateAccount,
  UpdateAccount: UpdateAccount,
  Line: Line,
  CreateInvoice: CreateInvoice,
  UpdateInvoice: UpdateInvoice,
  CreateCreditMemo: CreateCreditMemo,
  UpdateCreditMemo: UpdateCreditMemo,
  CreditMemo: CreditMemo,
  CreatePayment: CreatePayment,
  JournalEntryLine: JournalEntryLine,
  JournalEntry: JournalEntry,
  BillLine: BillLine,
  Bill: Bill,
  CreateBill: CreateBill,
  BillPaymentLinkedTxn: BillPaymentLinkedTxn,
  BillPaymentLine: BillPaymentLine,
  BillPayment: BillPayment,
  PurchaseLine: PurchaseLine,
  Purchase: Purchase,
  Transfer: Transfer,
  DepositLine: DepositLine,
  Deposit: Deposit,
  DeleteResponse: DeleteResponse,
  LinkedTxn: LinkedTxn,
  MarkupInfo: MarkupInfo,
  ItemBasedExpenseLine: ItemBasedExpenseLine,
  PurchaseOrderLine: PurchaseOrderLine,
  CustomField: CustomField,
  TaxLine: TaxLine,
  TxnTaxDetail: TxnTaxDetail,
  PhysicalAddress: PhysicalAddress,
  CreatePurchaseOrder: CreatePurchaseOrder,
  PurchaseOrder: PurchaseOrder,
  AccountBasedExpenseLineDetail: AccountBasedExpenseLineDetail,
  CreateJournalEntry: CreateJournalEntry,
  UpdateJournalEntry: UpdateJournalEntry
};
