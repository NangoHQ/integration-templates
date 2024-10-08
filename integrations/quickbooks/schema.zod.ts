// Generated by ts-to-zod
import { z } from 'zod';

export const updatesSchema = z.object({
    id: z.string(),
    sync_token: z.string()
});

export const metadataSchema = z.object({
    created_at: z.string(),
    updated_at: z.string()
});

export const billAddrSchema = z.object({
    city: z.string().nullable(),
    line1: z.string().nullable(),
    postal_code: z.string().nullable(),
    country: z.string().nullable(),
    id: z.string()
});

export const invoiceItemSchema = z.object({
    id: z.string(),
    description: z.string().nullable(),
    qty: z.number(),
    unit_price_cents: z.number(),
    amount_cents: z.number()
});

export const baseInvoiceSchema = z.object({
    created_at: z.string(),
    updated_at: z.string(),
    id: z.string(),
    txn_date: z.string(),
    balance_cents: z.number(),
    total_amt_cents: z.number(),
    bill_address: billAddrSchema.nullable(),
    items: z.array(invoiceItemSchema)
});

export const referenceSchema = z.object({
    name: z.string().optional(),
    value: z.string()
});

export const customerSchema = z.object({
    created_at: z.string(),
    updated_at: z.string(),
    id: z.string(),
    given_name: z.string().nullable(),
    display_name: z.string().nullable(),
    active: z.boolean(),
    balance_cents: z.number(),
    taxable: z.boolean(),
    primary_email: z.string().nullable(),
    primary_phone: z.string().nullable(),
    bill_address: billAddrSchema.nullable(),
    ship_address: billAddrSchema.nullable()
});

export const accountSchema = z.object({
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
    description: z.string().nullable(),
    acct_num: z.string().nullable(),
    sub_account: z.boolean()
});

export const paymentSchema = z.object({
    created_at: z.string(),
    updated_at: z.string(),
    id: z.string(),
    amount_cents: z.number(),
    customer_name: z.string().nullable(),
    txn_date: z.string()
});

export const itemSchema = z.object({
    created_at: z.string(),
    updated_at: z.string(),
    id: z.string(),
    name: z.string(),
    active: z.boolean(),
    type: z.string(),
    unit_price_cents: z.number(),
    purchase_cost_cents: z.number(),
    qty_on_hand: z.number().nullable(),
    inv_start_date: z.string().nullable(),
    description: z.string().nullable(),
    track_qty_onHand: z.boolean()
});

export const invoiceSchema = z.object({
    created_at: z.string(),
    updated_at: z.string(),
    id: z.string(),
    txn_date: z.string(),
    balance_cents: z.number(),
    total_amt_cents: z.number(),
    bill_address: billAddrSchema.nullable(),
    items: z.array(invoiceItemSchema),
    due_date: z.string(),
    deposit_cents: z.number()
});

export const addressSchema = z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    lat: z.string().optional(),
    long: z.string().optional()
});

export const createCustomerSchema = z.object({
    display_name: z.string().optional(),
    suffix: z.string().optional(),
    title: z.string().optional(),
    given_name: z.string().optional(),
    company_name: z.string().optional(),
    notes: z.string().optional(),
    primary_email: z.string().optional(),
    primary_phone: z.string().optional(),
    bill_address: addressSchema.optional(),
    ship_address: addressSchema.optional()
});

export const updateCustomerSchema = z.object({
    display_name: z.string().optional(),
    suffix: z.string().optional(),
    title: z.string().optional(),
    given_name: z.string().optional(),
    company_name: z.string().optional(),
    notes: z.string().optional(),
    primary_email: z.string().optional(),
    primary_phone: z.string().optional(),
    bill_address: addressSchema.optional(),
    ship_address: addressSchema.optional(),
    id: z.string(),
    sync_token: z.string()
});

export const createItemSchema = z.object({
    track_qty_onHand: z.boolean().optional(),
    qty_on_hand: z.number().optional(),
    name: z.string(),
    expense_accountRef: referenceSchema.optional(),
    income_accountRef: referenceSchema.optional(),
    asset_accountRef: referenceSchema.optional(),
    inv_start_date: z.string().optional(),
    unit_price_cents: z.number().optional(),
    purchase_cost_cents: z.number().optional(),
    type: z.string().optional()
});

export const updateItemSchema = z.object({
    track_qty_onHand: z.boolean().optional(),
    qty_on_hand: z.number().optional(),
    name: z.string(),
    expense_accountRef: referenceSchema.optional(),
    income_accountRef: referenceSchema.optional(),
    asset_accountRef: referenceSchema.optional(),
    inv_start_date: z.string().optional(),
    unit_price_cents: z.number().optional(),
    purchase_cost_cents: z.number().optional(),
    type: z.string().optional(),
    id: z.string(),
    sync_token: z.string()
});

export const createAccountSchema = z.object({
    name: z.string(),
    account_type: z.string().optional(),
    account_sub_type: z.string().optional(),
    description: z.string().optional(),
    acct_num: z.string().optional()
});

export const updateAccountSchema = z.object({
    name: z.string(),
    account_type: z.string().optional(),
    account_sub_type: z.string().optional(),
    description: z.string().optional(),
    acct_num: z.string().optional(),
    id: z.string(),
    sync_token: z.string()
});

export const lineSchema = z.object({
    detail_type: z.string(),
    amount_cents: z.number(),
    sales_item_line_detail: z.object({
        item_ref: referenceSchema
    }),
    quantity: z.number().optional(),
    unit_price_cents: z.number().optional(),
    discount_rate: z.number().optional(),
    description: z.string().optional()
});

export const createInvoiceSchema = z.object({
    customer_ref: referenceSchema.optional(),
    line: z.array(lineSchema).optional(),
    due_date: z.string().optional(),
    currency_ref: referenceSchema.optional(),
    project_ref: referenceSchema.optional()
});

export const updateInvoiceSchema = z.object({
    customer_ref: referenceSchema.optional(),
    line: z.array(lineSchema).optional(),
    due_date: z.string().optional(),
    currency_ref: referenceSchema.optional(),
    project_ref: referenceSchema.optional(),
    id: z.string(),
    sync_token: z.string()
});

export const createCreditMemoSchema = z.object({
    customer_ref: referenceSchema.optional(),
    line: z.array(lineSchema).optional(),
    due_date: z.string().optional(),
    currency_ref: referenceSchema.optional(),
    project_ref: referenceSchema.optional()
});

export const updateCreditMemoSchema = z.object({
    customer_ref: referenceSchema.optional(),
    line: z.array(lineSchema).optional(),
    due_date: z.string().optional(),
    currency_ref: referenceSchema.optional(),
    project_ref: referenceSchema.optional(),
    id: z.string(),
    sync_token: z.string()
});

export const creditMemoSchema = z.object({
    created_at: z.string(),
    updated_at: z.string(),
    id: z.string(),
    txn_date: z.string(),
    balance_cents: z.number(),
    total_amt_cents: z.number(),
    bill_address: billAddrSchema.nullable(),
    items: z.array(invoiceItemSchema),
    remaining_credit: z.number(),
    customer_name: z.string().nullable()
});

export const createPaymentSchema = z.object({
    total_amount_cents: z.number(),
    customer_ref: referenceSchema,
    currency_ref: referenceSchema.optional(),
    project_ref: referenceSchema.optional()
});
