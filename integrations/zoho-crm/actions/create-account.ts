import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for creating an account
const InputSchema = z.object({
    accountName: z.string().describe('The name of the account. Example: "Acme Corporation"'),
    phone: z.string().optional().describe('Phone number of the account'),
    website: z.string().optional().describe('Website URL of the account'),
    industry: z.string().optional().describe('Industry type of the account'),
    accountType: z.string().optional().describe('Type of account (e.g., Customer, Partner, Competitor)'),
    billingStreet: z.string().optional().describe('Billing street address'),
    billingCity: z.string().optional().describe('Billing city'),
    billingState: z.string().optional().describe('Billing state'),
    billingCountry: z.string().optional().describe('Billing country'),
    billingCode: z.string().optional().describe('Billing postal/ZIP code'),
    shippingStreet: z.string().optional().describe('Shipping street address'),
    shippingCity: z.string().optional().describe('Shipping city'),
    shippingState: z.string().optional().describe('Shipping state'),
    shippingCountry: z.string().optional().describe('Shipping country'),
    shippingCode: z.string().optional().describe('Shipping postal/ZIP code'),
    annualRevenue: z.number().optional().describe('Annual revenue of the account'),
    employees: z.number().optional().describe('Number of employees'),
    description: z.string().optional().describe('Description of the account'),
    sicCode: z.string().optional().describe('Standard Industrial Classification code'),
    ownership: z.string().optional().describe('Ownership type (e.g., Private, Public)'),
    tickerSymbol: z.string().optional().describe('Stock ticker symbol'),
    parentAccountId: z.string().optional().describe('ID of the parent account')
});

// Zoho CRM uses PascalCase for field API names
// Note: Zoho CRM create response only returns id and limited fields, so most are optional
const ProviderAccountSchema = z.object({
    id: z.string(),
    Account_Name: z.string().optional(),
    Phone: z.string().nullable().optional(),
    Website: z.string().nullable().optional(),
    Industry: z.string().nullable().optional(),
    Account_Type: z.string().nullable().optional(),
    Billing_Street: z.string().nullable().optional(),
    Billing_City: z.string().nullable().optional(),
    Billing_State: z.string().nullable().optional(),
    Billing_Country: z.string().nullable().optional(),
    Billing_Code: z.string().nullable().optional(),
    Shipping_Street: z.string().nullable().optional(),
    Shipping_City: z.string().nullable().optional(),
    Shipping_State: z.string().nullable().optional(),
    Shipping_Country: z.string().nullable().optional(),
    Shipping_Code: z.string().nullable().optional(),
    Annual_Revenue: z.number().nullable().optional(),
    Employees: z.number().nullable().optional(),
    Description: z.string().nullable().optional(),
    SIC_Code: z.string().nullable().optional(),
    Ownership: z.string().nullable().optional(),
    Ticker_Symbol: z.string().nullable().optional(),
    Parent_Account: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            message: z.string(),
            details: ProviderAccountSchema.optional()
        })
    )
});

const OutputSchema = z.object({
    id: z.string(),
    accountName: z.string(),
    phone: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    accountType: z.string().optional(),
    billingStreet: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingCountry: z.string().optional(),
    billingCode: z.string().optional(),
    shippingStreet: z.string().optional(),
    shippingCity: z.string().optional(),
    shippingState: z.string().optional(),
    shippingCountry: z.string().optional(),
    shippingCode: z.string().optional(),
    annualRevenue: z.number().optional(),
    employees: z.number().optional(),
    description: z.string().optional(),
    sicCode: z.string().optional(),
    ownership: z.string().optional(),
    tickerSymbol: z.string().optional(),
    parentAccountId: z.string().optional()
});

const action = createAction({
    description: 'Create an account in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.accounts.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const recordData: Record<string, unknown> = {
            Account_Name: input.accountName
        };

        if (input.phone !== undefined) {
            recordData['Phone'] = input.phone;
        }
        if (input.website !== undefined) {
            recordData['Website'] = input.website;
        }
        if (input.industry !== undefined) {
            recordData['Industry'] = input.industry;
        }
        if (input.accountType !== undefined) {
            recordData['Account_Type'] = input.accountType;
        }
        if (input.billingStreet !== undefined) {
            recordData['Billing_Street'] = input.billingStreet;
        }
        if (input.billingCity !== undefined) {
            recordData['Billing_City'] = input.billingCity;
        }
        if (input.billingState !== undefined) {
            recordData['Billing_State'] = input.billingState;
        }
        if (input.billingCountry !== undefined) {
            recordData['Billing_Country'] = input.billingCountry;
        }
        if (input.billingCode !== undefined) {
            recordData['Billing_Code'] = input.billingCode;
        }
        if (input.shippingStreet !== undefined) {
            recordData['Shipping_Street'] = input.shippingStreet;
        }
        if (input.shippingCity !== undefined) {
            recordData['Shipping_City'] = input.shippingCity;
        }
        if (input.shippingState !== undefined) {
            recordData['Shipping_State'] = input.shippingState;
        }
        if (input.shippingCountry !== undefined) {
            recordData['Shipping_Country'] = input.shippingCountry;
        }
        if (input.shippingCode !== undefined) {
            recordData['Shipping_Code'] = input.shippingCode;
        }
        if (input.annualRevenue !== undefined) {
            recordData['Annual_Revenue'] = input.annualRevenue;
        }
        if (input.employees !== undefined) {
            recordData['Employees'] = input.employees;
        }
        if (input.description !== undefined) {
            recordData['Description'] = input.description;
        }
        if (input.sicCode !== undefined) {
            recordData['SIC_Code'] = input.sicCode;
        }
        if (input.ownership !== undefined) {
            recordData['Ownership'] = input.ownership;
        }
        if (input.tickerSymbol !== undefined) {
            recordData['Ticker_Symbol'] = input.tickerSymbol;
        }
        if (input.parentAccountId !== undefined) {
            recordData['Parent_Account'] = {
                id: input.parentAccountId
            };
        }

        const requestBody: { data: Record<string, unknown>[]; trigger: string[] } = {
            data: [recordData],
            trigger: []
        };

        // https://www.zoho.com/crm/developer/docs/api/v2/insert-records.html
        const response = await nango.post({
            endpoint: '/crm/v2/Accounts',
            data: requestBody,
            retries: 10
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const firstResult = parsedResponse.data[0];

        if (!firstResult) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'No response data received from Zoho CRM'
            });
        }

        if (firstResult.code !== 'SUCCESS' || !firstResult.details) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: firstResult.message || 'Failed to create account',
                code: firstResult.code
            });
        }

        const account = firstResult.details;

        return {
            id: account.id,
            accountName: account['Account_Name'] ?? input.accountName,
            ...(account['Phone'] != null && { phone: account['Phone'] }),
            ...(account['Website'] != null && { website: account['Website'] }),
            ...(account['Industry'] != null && { industry: account['Industry'] }),
            ...(account['Account_Type'] != null && { accountType: account['Account_Type'] }),
            ...(account['Billing_Street'] != null && { billingStreet: account['Billing_Street'] }),
            ...(account['Billing_City'] != null && { billingCity: account['Billing_City'] }),
            ...(account['Billing_State'] != null && { billingState: account['Billing_State'] }),
            ...(account['Billing_Country'] != null && { billingCountry: account['Billing_Country'] }),
            ...(account['Billing_Code'] != null && { billingCode: account['Billing_Code'] }),
            ...(account['Shipping_Street'] != null && { shippingStreet: account['Shipping_Street'] }),
            ...(account['Shipping_City'] != null && { shippingCity: account['Shipping_City'] }),
            ...(account['Shipping_State'] != null && { shippingState: account['Shipping_State'] }),
            ...(account['Shipping_Country'] != null && { shippingCountry: account['Shipping_Country'] }),
            ...(account['Shipping_Code'] != null && { shippingCode: account['Shipping_Code'] }),
            ...(account['Annual_Revenue'] != null && { annualRevenue: account['Annual_Revenue'] }),
            ...(account['Employees'] != null && { employees: account['Employees'] }),
            ...(account['Description'] != null && { description: account['Description'] }),
            ...(account['SIC_Code'] != null && { sicCode: account['SIC_Code'] }),
            ...(account['Ownership'] != null && { ownership: account['Ownership'] }),
            ...(account['Ticker_Symbol'] != null && { tickerSymbol: account['Ticker_Symbol'] }),
            ...(account['Parent_Account']?.id != null && { parentAccountId: account['Parent_Account'].id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
