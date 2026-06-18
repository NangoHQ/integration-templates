import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemInputSchema = z.object({
    line_item_id: z.string().optional().describe('Unique identifier of the line item. Example: "260815000000106001"'),
    account_id: z.string().optional().describe('ID of the expense account. Example: "260815000000000388"'),
    description: z.string().optional().describe('Description of the expense line item. Max-length [100]'),
    amount: z.number().optional().describe('Amount of the line item'),
    tax_id: z.string().optional().describe('Unique identifier of the tax. Example: "260815000000000097"')
});

const InputSchema = z.object({
    expense_id: z.string().describe('Unique identifier of the expense. Example: "260815000000106001"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    account_id: z.string().optional().describe('ID of the expense account. Example: "260815000000000388"'),
    date: z.string().optional().describe('Date of the expense. Format: YYYY-MM-DD'),
    amount: z.number().optional().describe('Amount of the Expense'),
    tax_id: z.string().optional().describe('Unique identifier of the tax. Example: "260815000000000097"'),
    description: z.string().optional().describe('Description of the expense. Max-length [100]'),
    reference_number: z.string().optional().describe('Reference number of the expense. Max-length [100]'),
    is_billable: z.boolean().optional().describe('To specify whether the expense is billable to the customer or not'),
    customer_id: z.string().optional().describe('ID of the customer. Example: "260815000000097001"'),
    currency_id: z.string().optional().describe('Unique identifier of the currency. Example: "260815000000000097"'),
    exchange_rate: z.number().optional().describe('Exchange rate of the currency with respect to the base currency'),
    project_id: z.string().optional().describe('ID of the project associated with the customer'),
    vendor_id: z.string().optional().describe('ID of the vendor the expense is made to. Example: "260815000000098001"'),
    paid_through_account_id: z.string().optional().describe('ID of the paid through account'),
    line_items: z.array(LineItemInputSchema).optional().describe('Line items for the expense'),
    is_inclusive_tax: z.boolean().optional().describe('To specify whether the tax is inclusive in the amount or not')
});

const ProviderExpenseSchema = z
    .object({
        expense_id: z.string(),
        date: z.string().optional(),
        amount: z.number().optional(),
        description: z.string().optional(),
        reference_number: z.string().optional(),
        status: z.string().optional(),
        account_id: z.string().optional(),
        account_name: z.string().optional(),
        customer_id: z.string().optional(),
        customer_name: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        exchange_rate: z.number().optional(),
        project_id: z.string().optional(),
        project_name: z.string().optional(),
        vendor_id: z.string().optional(),
        vendor_name: z.string().optional(),
        paid_through_account_id: z.string().optional(),
        paid_through_account_name: z.string().optional(),
        is_billable: z.boolean().optional(),
        is_personal: z.boolean().optional(),
        is_inclusive_tax: z.boolean().optional(),
        tax_id: z.string().optional(),
        tax_name: z.string().optional(),
        tax_percentage: z.number().optional(),
        sub_total: z.number().optional(),
        total: z.number().optional(),
        bcy_total: z.number().optional(),
        tax_amount: z.number().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    expense: ProviderExpenseSchema.optional()
});

const OutputSchema = z.object({
    expense_id: z.string(),
    date: z.string().optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    reference_number: z.string().optional(),
    status: z.string().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    project_id: z.string().optional(),
    project_name: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    paid_through_account_id: z.string().optional(),
    paid_through_account_name: z.string().optional(),
    is_billable: z.boolean().optional(),
    is_personal: z.boolean().optional(),
    is_inclusive_tax: z.boolean().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.number().optional(),
    sub_total: z.number().optional(),
    total: z.number().optional(),
    bcy_total: z.number().optional(),
    tax_amount: z.number().optional()
});

const action = createAction({
    description: 'Update an expense in Zoho Books',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.expenses.UPDATE', 'ZohoBooks.settings.READ'],

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

        const updateBody: Record<string, unknown> = {
            ...(input.account_id !== undefined && { account_id: input.account_id }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.tax_id !== undefined && { tax_id: input.tax_id }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.is_billable !== undefined && { is_billable: input.is_billable }),
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.project_id !== undefined && { project_id: input.project_id }),
            ...(input.vendor_id !== undefined && { vendor_id: input.vendor_id }),
            ...(input.paid_through_account_id !== undefined && { paid_through_account_id: input.paid_through_account_id }),
            ...(input.line_items !== undefined && { line_items: input.line_items }),
            ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax })
        };

        const response = await nango.put({
            // https://www.zoho.com/books/api/v3/expenses/#update-an-expense
            endpoint: `/books/v3/expenses/${encodeURIComponent(input.expense_id)}`,
            params: {
                organization_id: organizationId
            },
            data: updateBody,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_response_error',
                message: 'Unexpected response from Zoho Books API',
                details: providerResponse.error.message
            });
        }

        if (providerResponse.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.data.message
            });
        }

        const expense = providerResponse.data.expense;

        if (!expense) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return an expense object.'
            });
        }

        return {
            expense_id: expense.expense_id,
            ...(expense.date !== undefined && { date: expense.date }),
            ...(expense.amount !== undefined && { amount: expense.amount }),
            ...(expense.description !== undefined && { description: expense.description }),
            ...(expense.reference_number !== undefined && { reference_number: expense.reference_number }),
            ...(expense.status !== undefined && { status: expense.status }),
            ...(expense.account_id !== undefined && { account_id: expense.account_id }),
            ...(expense.account_name !== undefined && { account_name: expense.account_name }),
            ...(expense.customer_id !== undefined && { customer_id: expense.customer_id }),
            ...(expense.customer_name !== undefined && { customer_name: expense.customer_name }),
            ...(expense.currency_id !== undefined && { currency_id: expense.currency_id }),
            ...(expense.currency_code !== undefined && { currency_code: expense.currency_code }),
            ...(expense.exchange_rate !== undefined && { exchange_rate: expense.exchange_rate }),
            ...(expense.project_id !== undefined && { project_id: expense.project_id }),
            ...(expense.project_name !== undefined && { project_name: expense.project_name }),
            ...(expense.vendor_id !== undefined && { vendor_id: expense.vendor_id }),
            ...(expense.vendor_name !== undefined && { vendor_name: expense.vendor_name }),
            ...(expense.paid_through_account_id !== undefined && { paid_through_account_id: expense.paid_through_account_id }),
            ...(expense.paid_through_account_name !== undefined && { paid_through_account_name: expense.paid_through_account_name }),
            ...(expense.is_billable !== undefined && { is_billable: expense.is_billable }),
            ...(expense.is_personal !== undefined && { is_personal: expense.is_personal }),
            ...(expense.is_inclusive_tax !== undefined && { is_inclusive_tax: expense.is_inclusive_tax }),
            ...(expense.tax_id !== undefined && { tax_id: expense.tax_id }),
            ...(expense.tax_name !== undefined && { tax_name: expense.tax_name }),
            ...(expense.tax_percentage !== undefined && { tax_percentage: expense.tax_percentage }),
            ...(expense.sub_total !== undefined && { sub_total: expense.sub_total }),
            ...(expense.total !== undefined && { total: expense.total }),
            ...(expense.bcy_total !== undefined && { bcy_total: expense.bcy_total }),
            ...(expense.tax_amount !== undefined && { tax_amount: expense.tax_amount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
