import { z } from "zod";

export const CancellationDetails = z.object({
  comment: z.union([z.string(), z.null()]),
  feedback: z.union([z.string(), z.null()]),
  reason: z.union([z.string(), z.null()])
});

export type CancellationDetails = z.infer<typeof CancellationDetails>;

export const Issuer = z.object({
  type: z.string()
});

export type Issuer = z.infer<typeof Issuer>;

export const InvoiceSettings = z.object({
  issuer: Issuer,
  account_tax_ids: z.union([z.null(), z.string(), z.string().array()])
});

export type InvoiceSettings = z.infer<typeof InvoiceSettings>;

export const Plan = z.object({
  id: z.string(),
  object: z.string(),
  active: z.boolean(),
  aggregate_usage: z.any(),
  amount: z.number(),
  amount_decimal: z.string(),
  billing_scheme: z.string(),
  created: z.number(),
  currency: z.string(),
  discounts: z.any(),
  interval: z.string(),
  interval_count: z.number(),
  livemode: z.boolean(),
  nickname: z.any(),
  product: z.string(),
  tiers_mode: z.any(),
  transform_usage: z.any(),
  trial_period_days: z.any(),
  usage_type: z.string()
});

export type Plan = z.infer<typeof Plan>;

export const Recurring = z.object({
  aggregate_usage: z.any(),
  interval: z.string(),
  interval_count: z.number(),
  trial_period_days: z.any(),
  usage_type: z.string()
});

export type Recurring = z.infer<typeof Recurring>;

export const Price = z.object({
  id: z.string(),
  object: z.string(),
  active: z.boolean(),
  billing_scheme: z.string(),
  created: z.number(),
  currency: z.string(),
  custom_unit_amount: z.any(),
  livemode: z.boolean(),
  lookup_key: z.any(),
  nickname: z.any(),
  product: z.string(),
  recurring: Recurring,
  tax_behavior: z.string(),
  tiers_mode: z.any(),
  transform_quantity: z.any(),
  type: z.string(),
  unit_amount: z.number(),
  unit_amount_decimal: z.string()
});

export type Price = z.infer<typeof Price>;

export const Item = z.object({
  id: z.string(),
  billing_thresholds: z.union([z.string(), z.null()]),
  created: z.number(),
  plan: Plan,
  price: Price,
  quantity: z.number(),
  subscription: z.string(),
  tax_rates: z.string().array()
});

export type Item = z.infer<typeof Item>;

export const PaymentSettings = z.object({
  payment_method_options: z.union([z.string(), z.null()]),
  payment_method_types: z.union([z.string(), z.null()]),
  save_default_payment_method: z.string()
});

export type PaymentSettings = z.infer<typeof PaymentSettings>;

export const EndBehavior = z.object({
  missing_payment_method: z.string()
});

export type EndBehavior = z.infer<typeof EndBehavior>;

export const TrialSettings = z.object({
  end_behavior: EndBehavior
});

export type TrialSettings = z.infer<typeof TrialSettings>;

export const Subscription = z.object({
  id: z.string(),

  automatic_tax: z.object({
    enabled: z.boolean(),
    liability: z.union([z.boolean(), z.string(), z.null()]),
    disabled_reason: z.union([z.string(), z.null()])
  }),

  billing_cycle_anchor: z.number(),
  billing_thresholds: z.union([z.string(), z.null()]),
  cancel_at: z.union([z.string(), z.null()]),
  cancel_at_period_end: z.boolean(),
  canceled_at: z.union([z.string(), z.null()]),
  cancellation_details: CancellationDetails,
  collection_method: z.string(),
  created: z.number(),
  currency: z.string(),
  current_period_end: z.number(),
  current_period_start: z.number(),
  customer: z.string(),
  days_until_due: z.union([z.number(), z.null()]),
  default_payment_method: z.union([z.string(), z.null()]),
  description: z.union([z.string(), z.null()]),
  discount: z.union([z.string(), z.null()]),
  discounts: z.union([z.string().array(), z.null()]),
  ended_at: z.union([z.string(), z.null()]),
  invoice_settings: InvoiceSettings,
  items: Item.array(),
  latest_invoice: z.string(),
  livemode: z.boolean(),
  next_pending_invoice_item_invoice: z.union([z.string(), z.null()]),
  on_behalf_of: z.union([z.string(), z.null()]),
  pause_collection: z.union([z.string(), z.null()]),
  payment_settings: PaymentSettings,
  pending_invoice_item_interval: z.union([z.string(), z.null()]),
  pending_setup_intent: z.union([z.string(), z.null()]),
  schedule: z.union([z.string(), z.null()]),
  start_date: z.number(),
  status: z.string(),
  transfer_data: z.union([z.string(), z.null()]),
  trial_end: z.union([z.string(), z.null()]),
  trial_settings: TrialSettings,
  trial_start: z.union([z.string(), z.null()])
});

export type Subscription = z.infer<typeof Subscription>;

export const models = {
  CancellationDetails: CancellationDetails,
  Issuer: Issuer,
  InvoiceSettings: InvoiceSettings,
  Plan: Plan,
  Recurring: Recurring,
  Price: Price,
  Item: Item,
  PaymentSettings: PaymentSettings,
  EndBehavior: EndBehavior,
  TrialSettings: TrialSettings,
  Subscription: Subscription
};