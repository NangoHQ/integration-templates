import { z } from "zod";

export const ClickSendSendSmsInput = z.object({
  to: z.string(),
  body: z.string()
});

export type ClickSendSendSmsInput = z.infer<typeof ClickSendSendSmsInput>;

export const Sms = z.object({
  id: z.string(),
  to: z.string(),
  from: z.string(),
  body: z.string(),

  status: z.union([
    z.literal("QUEUED"),
    z.literal("COMPLETED"),
    z.literal("SCHEDULED"),
    z.literal("WAIT_APPROVAL"),
    z.literal("FAILED"),
    z.literal("CANCELLED"),
    z.literal("CANCELLED_AFTER_REVIEW"),
    z.literal("RECEIVED"),
    z.literal("SENT"),
    z.literal("SUCCESS")
  ]),

  createdAt: z.string(),
  updatedAt: z.string()
});

export type Sms = z.infer<typeof Sms>;

export const Account = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  balance: z.string(),
  country: z.string(),
  timezone: z.string(),
  accountName: z.string(),
  accountBillingEmail: z.string()
});

export type Account = z.infer<typeof Account>;

export const models = {
  ClickSendSendSmsInput: ClickSendSendSmsInput,
  Sms: Sms,
  Account: Account
};