import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Account name. Example: "Acme Corporation"'),
    domain: z.string().optional().describe('Account domain. Example: "acme.com"'),
    phone: z.string().optional().describe('Account phone number. Example: "+1-555-123-4567"'),
    raw_address: z.string().optional().describe('Account address. Example: "123 Main St, San Francisco, CA 94105"'),
    industry: z.string().optional().describe('Account industry. Example: "Software"'),
    number_of_employees: z.number().optional().describe('Number of employees. Example: 500'),
    annual_revenue: z.number().optional().describe('Annual revenue. Example: 1000000'),
    website_url: z.string().optional().describe('Account website URL. Example: "https://acme.com"'),
    owner_id: z.string().optional().describe('ID of the user who owns this account. Example: "6a0af1f0c9f63c0018aed306"'),
    account_stage_id: z.string().optional().describe('ID of the account stage. Example: "6a0af1f0c9f63c0018aed307"'),
    crm_id: z.string().optional().describe('CRM ID for the account. Example: "0015000000ABC123"')
});

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    domain: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    raw_address: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
    number_of_employees: z.number().optional().nullable(),
    annual_revenue: z.number().optional().nullable(),
    website_url: z.string().optional().nullable(),
    owner_id: z.string().optional().nullable(),
    account_stage_id: z.string().optional().nullable(),
    crm_id: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    account: ProviderAccountSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    phone: z.string().optional(),
    raw_address: z.string().optional(),
    industry: z.string().optional(),
    number_of_employees: z.number().optional(),
    annual_revenue: z.number().optional(),
    website_url: z.string().optional(),
    owner_id: z.string().optional(),
    account_stage_id: z.string().optional(),
    crm_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create an account in Apollo.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            name: input.name
        };

        if (input.domain !== undefined) {
            payload['domain'] = input.domain;
        }
        if (input.phone !== undefined) {
            payload['phone'] = input.phone;
        }
        if (input.raw_address !== undefined) {
            payload['raw_address'] = input.raw_address;
        }
        if (input.industry !== undefined) {
            payload['industry'] = input.industry;
        }
        if (input.number_of_employees !== undefined) {
            payload['number_of_employees'] = input.number_of_employees;
        }
        if (input.annual_revenue !== undefined) {
            payload['annual_revenue'] = input.annual_revenue;
        }
        if (input.website_url !== undefined) {
            payload['website_url'] = input.website_url;
        }
        if (input.owner_id !== undefined) {
            payload['owner_id'] = input.owner_id;
        }
        if (input.account_stage_id !== undefined) {
            payload['account_stage_id'] = input.account_stage_id;
        }
        if (input.crm_id !== undefined) {
            payload['crm_id'] = input.crm_id;
        }

        // https://docs.apollo.io/reference/create-account
        const response = await nango.post({
            endpoint: '/v1/accounts',
            data: payload,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create account: no response data'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const account = providerResponse.account;

        return {
            id: account.id,
            ...(account.name != null && { name: account.name }),
            ...(account.domain != null && { domain: account.domain }),
            ...(account.phone != null && { phone: account.phone }),
            ...(account.raw_address != null && { raw_address: account.raw_address }),
            ...(account.industry != null && { industry: account.industry }),
            ...(account.number_of_employees != null && { number_of_employees: account.number_of_employees }),
            ...(account.annual_revenue != null && { annual_revenue: account.annual_revenue }),
            ...(account.website_url != null && { website_url: account.website_url }),
            ...(account.owner_id != null && { owner_id: account.owner_id }),
            ...(account.account_stage_id != null && { account_stage_id: account.account_stage_id }),
            ...(account.crm_id != null && { crm_id: account.crm_id }),
            ...(account.created_at != null && { created_at: account.created_at }),
            ...(account.updated_at != null && { updated_at: account.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
