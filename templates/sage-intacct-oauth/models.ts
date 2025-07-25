import { z } from "zod";

export const Account = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  account_type: z.string(),
  normal_balance: z.string(),
  status: z.string(),
  disallow_direct_posting: z.boolean(),
  closing_type: z.string(),
  alternative_GLAccount: z.string(),

  audit: z.object({
    created_date_time: z.string(),
    modified_date_time: z.string(),
    created_by: z.string(),
    modified_by: z.string()
  })
});

export type Account = z.infer<typeof Account>;

export const models = {
  Account: Account
};