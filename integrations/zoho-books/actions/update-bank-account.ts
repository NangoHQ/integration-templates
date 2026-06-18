import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    account_id: z.string().describe('Unique identifier of the bank account. Example: "260815000000102017"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    account_name: z.string().optional().describe('Name of the bank account. Example: "Corporate Account"'),
    account_type: z.string().optional().describe('Type of the account. Example: "bank" or "cash"'),
    account_number: z.string().optional().describe('Account number. Example: "80000009823"'),
    account_code: z.string().optional().describe('Account code. Example: "123"'),
    currency_id: z.string().optional().describe('Currency ID. Example: "260815000000000097"'),
    currency_code: z.string().optional().describe('Currency code. Example: "USD"'),
    description: z.string().optional().describe('Description of the account. Example: "Salary details."'),
    bank_name: z.string().optional().describe('Name of the bank. Example: "Xavier Bank"'),
    routing_number: z.string().optional().describe('Routing number of the bank. Example: "123456789"'),
    is_primary_account: z.boolean().optional().describe('Whether this is the primary account.'),
    is_paypal_account: z.boolean().optional().describe('Whether this is a PayPal account.'),
    paypal_type: z.string().optional().describe('PayPal account type. Example: "personal" or "business"'),
    paypal_email_address: z.string().optional().describe('PayPal email address. Example: "johnsmith@zilliuminc.com"')
});

const ProviderBankAccountSchema = z
    .object({
        account_id: z.string(),
        account_name: z.string().optional(),
        account_type: z.string().optional(),
        account_number: z.string().optional(),
        account_code: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        description: z.string().optional(),
        bank_name: z.string().optional(),
        routing_number: z.string().optional(),
        is_primary_account: z.boolean().optional(),
        is_paypal_account: z.boolean().optional(),
        paypal_type: z.string().optional(),
        paypal_email_address: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    account_id: z.string(),
    account_name: z.string().optional(),
    account_type: z.string().optional(),
    account_number: z.string().optional(),
    account_code: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    description: z.string().optional(),
    bank_name: z.string().optional(),
    routing_number: z.string().optional(),
    is_primary_account: z.boolean().optional(),
    is_paypal_account: z.boolean().optional(),
    paypal_type: z.string().optional(),
    paypal_email_address: z.string().optional()
});

const action = createAction({
    description: 'Update a bank account in Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.banking.UPDATE', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const data: Record<string, unknown> = {
            ...(input.account_name !== undefined && { account_name: input.account_name }),
            ...(input.account_type !== undefined && { account_type: input.account_type }),
            ...(input.account_number !== undefined && { account_number: input.account_number }),
            ...(input.account_code !== undefined && { account_code: input.account_code }),
            ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
            ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.bank_name !== undefined && { bank_name: input.bank_name }),
            ...(input.routing_number !== undefined && { routing_number: input.routing_number }),
            ...(input.is_primary_account !== undefined && { is_primary_account: input.is_primary_account }),
            ...(input.is_paypal_account !== undefined && { is_paypal_account: input.is_paypal_account }),
            ...(input.paypal_type !== undefined && { paypal_type: input.paypal_type }),
            ...(input.paypal_email_address !== undefined && { paypal_email_address: input.paypal_email_address })
        };

        // https://www.zoho.com/books/api/v3/bank-accounts/#update-bank-account
        const response = await nango.put({
            endpoint: `/books/v3/bankaccounts/${encodeURIComponent(input.account_id)}`,
            params: {
                organization_id: organizationId
            },
            data,
            retries: 3
        });

        const providerResponse = z
            .object({
                bankaccount: ProviderBankAccountSchema.optional()
            })
            .passthrough()
            .parse(response.data);

        const account = providerResponse.bankaccount;
        if (!account) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Bank account not found or update failed.'
            });
        }

        return {
            account_id: account.account_id,
            ...(account.account_name !== undefined && { account_name: account.account_name }),
            ...(account.account_type !== undefined && { account_type: account.account_type }),
            ...(account.account_number !== undefined && { account_number: account.account_number }),
            ...(account.account_code !== undefined && { account_code: account.account_code }),
            ...(account.currency_id !== undefined && { currency_id: account.currency_id }),
            ...(account.currency_code !== undefined && { currency_code: account.currency_code }),
            ...(account.description !== undefined && { description: account.description }),
            ...(account.bank_name !== undefined && { bank_name: account.bank_name }),
            ...(account.routing_number !== undefined && { routing_number: account.routing_number }),
            ...(account.is_primary_account !== undefined && { is_primary_account: account.is_primary_account }),
            ...(account.is_paypal_account !== undefined && { is_paypal_account: account.is_paypal_account }),
            ...(account.paypal_type !== undefined && { paypal_type: account.paypal_type }),
            ...(account.paypal_email_address !== undefined && { paypal_email_address: account.paypal_email_address })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
