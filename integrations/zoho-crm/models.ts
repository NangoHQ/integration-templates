import { z } from "zod";

export const ZohoCRMAccount = z.object({
  Owner: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  $currency_symbol: z.string(),
  $field_states: z.string(),
  Account_Type: z.string(),
  SIC_Code: z.string(),
  Last_Activity_Time: z.date(),
  Industry: z.string(),
  Account_Site: z.string(),
  $state: z.string(),
  $process_flow: z.boolean(),
  Billing_Country: z.string(),
  $locked_for_me: z.boolean(),
  id: z.string(),
  $approved: z.boolean(),

  $approval: z.object({
    delegate: z.boolean(),
    approve: z.boolean(),
    reject: z.boolean(),
    resubmit: z.boolean()
  }),

  Billing_Street: z.string(),
  Created_Time: z.date(),
  $editable: z.boolean(),
  Billing_Code: z.string(),
  Shipping_City: z.string(),
  Shipping_Country: z.string(),
  Shipping_Code: z.string(),
  Billing_City: z.string(),

  Created_By: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  $zia_owner_assignment: z.string(),
  Annual_Revenue: z.number(),
  Shipping_Street: z.string(),
  Ownership: z.string(),
  Description: z.string(),
  Rating: z.number(),
  Shipping_State: z.string(),

  $review_process: z.object({
    approve: z.boolean(),
    reject: z.boolean(),
    resubmit: z.boolean()
  }),

  Website: z.string(),
  Employees: z.number(),
  Record_Image: z.string(),

  Modified_By: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  $review: z.string(),
  Phone: z.string(),
  Account_Name: z.string(),
  Account_Number: z.string(),
  Ticker_Symbol: z.string(),
  Modified_Time: z.date(),
  $orchestration: z.boolean(),

  Parent_Account: z.object({
    name: z.string(),
    id: z.string()
  }),

  $in_merge: z.boolean(),
  Locked__s: z.boolean(),
  Billing_State: z.string(),
  Tag: z.any().array(),
  Fax: z.string(),
  $approval_state: z.string()
});

export type ZohoCRMAccount = z.infer<typeof ZohoCRMAccount>;

export const ZohoCRMContact = z.object({
  Owner: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  Email: z.string(),
  $currency_symbol: z.string(),
  $field_states: z.string(),
  Other_Phone: z.string(),
  Mailing_State: z.string(),
  Other_State: z.string(),
  Other_Country: z.string(),
  Last_Activity_Time: z.date(),
  Department: z.string(),
  $state: z.string(),
  Unsubscribed_Mode: z.string(),
  $process_flow: z.boolean(),
  Assistant: z.string(),
  Mailing_Country: z.string(),
  $locked_for_me: z.string(),
  id: z.string(),
  $approved: z.boolean(),

  Reporting_To: z.object({
    name: z.string(),
    id: z.string()
  }),

  $approval: z.object({
    delegate: z.boolean(),
    approve: z.boolean(),
    reject: z.boolean(),
    resubmit: z.boolean()
  }),

  Other_City: z.string(),
  Created_Time: z.date(),
  $editable: z.boolean(),
  Home_Phone: z.string(),

  Created_By: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  $zia_owner_assignment: z.string(),
  Secondary_Email: z.string(),
  Description: z.string(),

  Vendor_Name: z.object({
    name: z.string(),
    id: z.string()
  }),

  Mailing_Zip: z.string(),

  $review_process: z.object({
    approve: z.boolean(),
    reject: z.boolean(),
    resubmit: z.boolean()
  }),

  Twitter: z.string(),
  Other_Zip: z.string(),
  Mailing_Street: z.string(),
  Salutation: z.string(),
  First_Name: z.string(),
  Full_Name: z.string(),
  Asst_Phone: z.string(),
  Record_Image: z.string(),

  Modified_By: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  $review: z.boolean(),
  Skype_ID: z.string(),
  Phone: z.string(),

  Account_Name: z.object({
    name: z.string(),
    id: z.string()
  }),

  Email_Opt_Out: z.boolean(),
  Modified_Time: z.date(),
  Date_of_Birth: z.date(),
  Mailing_City: z.string(),
  Unsubscribed_Time: z.date(),
  Title: z.string(),
  Other_Street: z.string(),
  Mobile: z.string(),
  $orchestration: z.boolean(),
  Last_Name: z.string(),
  $in_merge: z.boolean(),
  Locked__s: z.boolean(),
  Lead_Source: z.string(),
  Tag: z.any().array(),
  Fax: z.string(),
  $approval_state: z.string()
});

export type ZohoCRMContact = z.infer<typeof ZohoCRMContact>;

export const ZohoCRMDeal = z.object({
  Owner: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  Description: z.string(),
  $currency_symbol: z.string(),

  Campaign_Source: z.object({
    name: z.string(),
    id: z.string()
  }),

  $field_states: z.string(),

  $review_process: z.object({
    approve: z.boolean(),
    reject: z.boolean(),
    resubmit: z.boolean()
  }),

  Closing_Date: z.date(),
  Reason_For_Loss__s: z.string(),
  Last_Activity_Time: z.date(),

  Modified_By: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  $review: z.string(),
  Lead_Conversion_Time: z.date(),
  $state: z.string(),
  $process_flow: z.boolean(),
  Deal_Name: z.string(),
  Expected_Revenue: z.number(),
  Overall_Sales_Duration: z.number(),
  Stage: z.string(),
  $locked_for_me: z.boolean(),

  Account_Name: z.object({
    name: z.string(),
    id: z.string()
  }),

  id: z.string(),
  $approved: z.boolean(),

  $approval: z.object({
    delegate: z.boolean(),
    approve: z.boolean(),
    reject: z.boolean(),
    resubmit: z.boolean()
  }),

  Modified_Time: z.date(),
  Created_Time: z.date(),
  Amount: z.number(),
  Next_Step: z.string(),
  Probability: z.number(),
  $editable: z.boolean(),
  $orchestration: z.boolean(),

  Contact_Name: z.object({
    name: z.string(),
    id: z.string()
  }),

  Sales_Cycle_Duration: z.number(),
  Type: z.string(),
  $in_merge: z.boolean(),
  Locked__s: z.boolean(),
  Lead_Source: z.string(),

  Created_By: z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
  }),

  Tag: z.any().array(),
  $zia_owner_assignment: z.string(),
  $approval_state: z.string()
});

export type ZohoCRMDeal = z.infer<typeof ZohoCRMDeal>;

export const models = {
  ZohoCRMAccount: ZohoCRMAccount,
  ZohoCRMContact: ZohoCRMContact,
  ZohoCRMDeal: ZohoCRMDeal
};