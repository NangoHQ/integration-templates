import { z } from "zod";

export const Customer = z.object({
  first_name: z.string(),
  last_name: z.string(),
  display_name: z.string(),
  email: z.union([z.string(), z.null()]),
  phone: z.union([z.string(), z.null()])
});

export type Customer = z.infer<typeof Customer>;

export const Address = z.object({
  address1: z.string(),
  address2: z.union([z.string(), z.null()]),
  city: z.string(),
  country: z.string(),
  province: z.union([z.string(), z.null()]),
  zip: z.union([z.string(), z.null()])
});

export type Address = z.infer<typeof Address>;

export const Order = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  processed_at: z.string(),
  currency_code: z.string(),
  presentment_currency_code: z.string(),
  confirmed: z.boolean(),
  cancelled_at: z.union([z.string(), z.null()]),
  cancel_reason: z.union([z.string(), z.null()]),
  closed: z.boolean(),
  closed_at: z.union([z.string(), z.null()]),
  fully_paid: z.boolean(),
  customer: z.union([Customer, z.null()]),

  total_price_set: z.object({
    amount: z.string(),
    currency_code: z.string()
  }),

  subtotal_price_set: z.object({
    amount: z.string(),
    currency_code: z.string()
  }),

  total_tax_set: z.object({
    amount: z.string(),
    currency_code: z.string()
  }),

  shipping_address: z.union([Address, z.null()]),
  billing_address: z.union([Address, z.null()]),

  line_item: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),

    original_total_set: z.object({
      amount: z.string(),
      currency_code: z.string()
    }),

    discounted_total_set: z.object({
      amount: z.string(),
      currency_code: z.string()
    })
  }))
});

export type Order = z.infer<typeof Order>;

export const models = {
  Customer: Customer,
  Address: Address,
  Order: Order
};