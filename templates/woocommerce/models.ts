import { z } from "zod";

export const Customer = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  is_paying_customer: z.boolean(),
  created_at: z.string(),
  modified_at: z.string()
});

export type Customer = z.infer<typeof Customer>;

export const Order = z.object({
  id: z.string(),
  status: z.string(),
  total_amount: z.number(),
  currency: z.string(),
  created_at: z.string(),
  modified_at: z.string()
});

export type Order = z.infer<typeof Order>;

export const models = {
  Customer: Customer,
  Order: Order
};