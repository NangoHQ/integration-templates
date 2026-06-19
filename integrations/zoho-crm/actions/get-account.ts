import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Account ID. Example: "4150868000002782004"')
});

const OwnerSchema = z.object({
    name: z.string().nullish(),
    id: z.string().nullish(),
    email: z.string().nullish()
});

const ApprovalSchema = z.object({
    delegate: z.boolean().nullish(),
    approve: z.boolean().nullish(),
    reject: z.boolean().nullish(),
    resubmit: z.boolean().nullish()
});

const ReviewProcessSchema = z.object({
    approve: z.boolean().nullish(),
    reject: z.boolean().nullish(),
    resubmit: z.boolean().nullish()
});

const ParentAccountSchema = z.object({
    name: z.string().nullish(),
    id: z.string().nullish()
});

const AccountSchema = z.object({
    id: z.string(),
    Account_Name: z.string().nullish(),
    Account_Type: z.string().nullish(),
    Account_Site: z.string().nullish(),
    Account_Number: z.string().nullish(),
    Owner: OwnerSchema.nullish(),
    SIC_Code: z.string().nullish(),
    Industry: z.string().nullish(),
    Annual_Revenue: z.number().nullish(),
    Employees: z.number().nullish(),
    Ownership: z.string().nullish(),
    Rating: z.string().nullish(),
    Website: z.string().nullish(),
    Phone: z.string().nullish(),
    Fax: z.string().nullish(),
    Description: z.string().nullish(),
    Ticker_Symbol: z.string().nullish(),
    Billing_Street: z.string().nullish(),
    Billing_City: z.string().nullish(),
    Billing_State: z.string().nullish(),
    Billing_Country: z.string().nullish(),
    Billing_Code: z.string().nullish(),
    Shipping_Street: z.string().nullish(),
    Shipping_City: z.string().nullish(),
    Shipping_State: z.string().nullish(),
    Shipping_Country: z.string().nullish(),
    Shipping_Code: z.string().nullish(),
    Parent_Account: ParentAccountSchema.nullish(),
    Created_By: OwnerSchema.nullish(),
    Modified_By: OwnerSchema.nullish(),
    Created_Time: z.string().nullish(),
    Modified_Time: z.string().nullish(),
    Last_Activity_Time: z.string().nullish(),
    Record_Image: z.string().nullish(),
    Currency: z.string().nullish(),
    $currency_symbol: z.string().nullish(),
    Exchange_Rate: z.number().nullish(),
    $approved: z.boolean().nullish(),
    $approval: ApprovalSchema.nullish(),
    $editable: z.boolean().nullish(),
    $review_process: ReviewProcessSchema.nullish(),
    $review: z.unknown().nullish(),
    $process_flow: z.boolean().nullish(),
    $orchestration: z.boolean().nullish(),
    $in_merge: z.boolean().nullish(),
    $approval_state: z.string().nullish(),
    Territories: z.array(z.string()).nullish(),
    Tag: z.array(z.unknown()).nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    account_name: z.string().optional(),
    account_type: z.string().optional(),
    account_site: z.string().optional(),
    account_number: z.string().optional(),
    owner_id: z.string().optional(),
    owner_name: z.string().optional(),
    owner_email: z.string().optional(),
    sic_code: z.string().optional(),
    industry: z.string().optional(),
    annual_revenue: z.number().optional(),
    employees: z.number().optional(),
    ownership: z.string().optional(),
    rating: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    description: z.string().optional(),
    ticker_symbol: z.string().optional(),
    billing_street: z.string().optional(),
    billing_city: z.string().optional(),
    billing_state: z.string().optional(),
    billing_country: z.string().optional(),
    billing_code: z.string().optional(),
    shipping_street: z.string().optional(),
    shipping_city: z.string().optional(),
    shipping_state: z.string().optional(),
    shipping_country: z.string().optional(),
    shipping_code: z.string().optional(),
    parent_account_id: z.string().optional(),
    parent_account_name: z.string().optional(),
    created_by_id: z.string().optional(),
    created_by_name: z.string().optional(),
    created_by_email: z.string().optional(),
    modified_by_id: z.string().optional(),
    modified_by_name: z.string().optional(),
    modified_by_email: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    last_activity_time: z.string().optional(),
    record_image: z.string().optional(),
    currency: z.string().optional(),
    currency_symbol: z.string().optional(),
    exchange_rate: z.number().optional(),
    approved: z.boolean().optional(),
    editable: z.boolean().optional(),
    approval_state: z.string().optional(),
    territories: z.array(z.string()).optional(),
    tags: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single account from Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.accounts.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/get-record.html
        const response = await nango.get({
            endpoint: `/crm/v2/Accounts/${input.id}`,
            retries: 3
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Account not found',
                id: input.id
            });
        }

        const account = AccountSchema.parse(response.data.data[0]);

        return {
            id: account.id,
            ...(account.Account_Name != null && { account_name: account.Account_Name }),
            ...(account.Account_Type != null && { account_type: account.Account_Type }),
            ...(account.Account_Site != null && { account_site: account.Account_Site }),
            ...(account.Account_Number != null && { account_number: account.Account_Number }),
            ...(account.Owner?.id != null && { owner_id: account.Owner.id }),
            ...(account.Owner?.name != null && { owner_name: account.Owner.name }),
            ...(account.Owner?.email != null && { owner_email: account.Owner.email }),
            ...(account.SIC_Code != null && { sic_code: account.SIC_Code }),
            ...(account.Industry != null && { industry: account.Industry }),
            ...(account.Annual_Revenue != null && { annual_revenue: account.Annual_Revenue }),
            ...(account.Employees != null && { employees: account.Employees }),
            ...(account.Ownership != null && { ownership: account.Ownership }),
            ...(account.Rating != null && { rating: account.Rating }),
            ...(account.Website != null && { website: account.Website }),
            ...(account.Phone != null && { phone: account.Phone }),
            ...(account.Fax != null && { fax: account.Fax }),
            ...(account.Description != null && { description: account.Description }),
            ...(account.Ticker_Symbol != null && { ticker_symbol: account.Ticker_Symbol }),
            ...(account.Billing_Street != null && { billing_street: account.Billing_Street }),
            ...(account.Billing_City != null && { billing_city: account.Billing_City }),
            ...(account.Billing_State != null && { billing_state: account.Billing_State }),
            ...(account.Billing_Country != null && { billing_country: account.Billing_Country }),
            ...(account.Billing_Code != null && { billing_code: account.Billing_Code }),
            ...(account.Shipping_Street != null && { shipping_street: account.Shipping_Street }),
            ...(account.Shipping_City != null && { shipping_city: account.Shipping_City }),
            ...(account.Shipping_State != null && { shipping_state: account.Shipping_State }),
            ...(account.Shipping_Country != null && { shipping_country: account.Shipping_Country }),
            ...(account.Shipping_Code != null && { shipping_code: account.Shipping_Code }),
            ...(account.Parent_Account?.id != null && { parent_account_id: account.Parent_Account.id }),
            ...(account.Parent_Account?.name != null && { parent_account_name: account.Parent_Account.name }),
            ...(account.Created_By?.id != null && { created_by_id: account.Created_By.id }),
            ...(account.Created_By?.name != null && { created_by_name: account.Created_By.name }),
            ...(account.Created_By?.email != null && { created_by_email: account.Created_By.email }),
            ...(account.Modified_By?.id != null && { modified_by_id: account.Modified_By.id }),
            ...(account.Modified_By?.name != null && { modified_by_name: account.Modified_By.name }),
            ...(account.Modified_By?.email != null && { modified_by_email: account.Modified_By.email }),
            ...(account.Created_Time != null && { created_time: account.Created_Time }),
            ...(account.Modified_Time != null && { modified_time: account.Modified_Time }),
            ...(account.Last_Activity_Time != null && { last_activity_time: account.Last_Activity_Time }),
            ...(account.Record_Image != null && { record_image: account.Record_Image }),
            ...(account.Currency != null && { currency: account.Currency }),
            ...(account.$currency_symbol != null && { currency_symbol: account.$currency_symbol }),
            ...(account.Exchange_Rate != null && { exchange_rate: account.Exchange_Rate }),
            ...(account.$approved != null && { approved: account.$approved }),
            ...(account.$editable != null && { editable: account.$editable }),
            ...(account.$approval_state != null && { approval_state: account.$approval_state }),
            ...(account.Territories != null && { territories: account.Territories }),
            ...(account.Tag != null && { tags: account.Tag })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
