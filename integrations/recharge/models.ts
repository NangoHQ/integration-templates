import { z } from "zod";

export const Customer = z.object({
  id: z.string(),
  phone_number: z.union([z.string(), z.null()]),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.union([z.string(), z.null()]),
  email: z.union([z.string(), z.null()]),

  subscriptions: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    start_date: z.string(),
    end_date: z.union([z.string(), z.null()]),
    next_charge_scheduled_at: z.union([z.string(), z.null()])
  }))
});

export type Customer = z.infer<typeof Customer>;

export const ExternalCustomerId = z.object({
  ecommerce: z.string()
});

export type ExternalCustomerId = z.infer<typeof ExternalCustomerId>;

export const UpsertRechargeCustomerInput = z.object({
  email: z.string(),
  external_customer_id: ExternalCustomerId.optional(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().optional(),
  tax_exempt: z.boolean().optional()
});

export type UpsertRechargeCustomerInput = z.infer<typeof UpsertRechargeCustomerInput>;

export const UpsertRechargeCustomerOutput = z.object({
  action: z.union([z.literal("update"), z.literal("create")]),

  response: z.object({
    accepts_marketing: z.union([z.number(), z.null()]),

    analytics_data: z.object({
      utm_params: z.array(z.object({
        utm_campaign: z.string().optional(),
        utm_content: z.string().optional(),
        utm_data_source: z.string().optional(),
        utm_source: z.string().optional(),
        utm_medium: z.string().optional(),
        utm_term: z.string().optional(),
        utm_timestamp: z.string().optional()
      }))
    }),

    billing_address1: z.union([z.string(), z.null()]),
    billing_address2: z.union([z.string(), z.null()]),
    billing_city: z.union([z.string(), z.null()]),
    billing_company: z.union([z.string(), z.null()]),
    billing_country: z.union([z.string(), z.null()]),
    billing_phone: z.union([z.string(), z.null()]),
    billing_province: z.union([z.string(), z.null()]),
    billing_zip: z.union([z.string(), z.null()]),
    created_at: z.string(),
    email: z.string(),
    first_charge_processed_at: z.union([z.string(), z.null()]),
    first_name: z.string(),
    has_card_error_in_dunning: z.boolean(),
    has_valid_payment_method: z.boolean(),
    hash: z.string(),
    id: z.number(),
    last_name: z.string(),
    number_active_subscriptions: z.number(),
    number_subscriptions: z.number(),
    phone: z.union([z.string(), z.null()]),
    processor_type: z.union([z.string(), z.null()]),
    reason_payment_method_not_valid: z.union([z.string(), z.null()]),
    shopify_customer_id: z.union([z.string(), z.null()]),
    status: z.string(),
    tax_exempt: z.boolean(),
    updated_at: z.string(),
    apply_credit_to_next_recurring_charge: z.boolean().optional(),
    external_customer_id: ExternalCustomerId.optional(),
    has_payment_method_in_dunning: z.boolean().optional(),
    subscriptions_active_count: z.number().optional(),
    subscriptions_total_count: z.number().optional(),
    subscription_related_charge_streak: z.number().optional()
  })
});

export type UpsertRechargeCustomerOutput = z.infer<typeof UpsertRechargeCustomerOutput>;

export const models = {
  Customer: Customer,
  ExternalCustomerId: ExternalCustomerId,
  UpsertRechargeCustomerInput: UpsertRechargeCustomerInput,
  UpsertRechargeCustomerOutput: UpsertRechargeCustomerOutput
};