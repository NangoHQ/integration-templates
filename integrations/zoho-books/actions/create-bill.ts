import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemInputSchema = z.object({
    item_id: z.string().optional().describe('Item ID. Example: "260815000000100002"'),
    name: z.string().optional().describe('Name of the line item'),
    description: z.string().optional().describe('Description of the line item'),
    account_id: z.string().optional().describe('Chart of accounts ID. Example: "260815000000000388"'),
    rate: z.number().optional().describe('Unit price of the line item'),
    quantity: z.number().optional().describe('Number of units'),
    tax_id: z.string().optional().describe('Tax ID for the line item'),
    unit: z.string().optional().describe('Unit of measurement')
});

const InputSchema = z.object({
    vendor_id: z.string().describe('Vendor ID. Example: "260815000000098001"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    bill_number: z.string().describe('Unique bill number. Example: "BILL-001"'),
    reference_number: z.string().optional().describe('External reference number'),
    date: z.string().optional().describe('Bill date in yyyy-mm-dd format'),
    due_date: z.string().optional().describe('Due date in yyyy-mm-dd format'),
    currency_id: z.string().optional().describe('Currency ID'),
    exchange_rate: z.number().optional().describe('Exchange rate to base currency'),
    notes: z.string().optional().describe('Notes about the bill'),
    line_items: z.array(LineItemInputSchema).optional().describe('Line items for the bill')
});

const LineItemOutputSchema = z.object({
    line_item_id: z.string(),
    item_id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    account_id: z.string().optional().nullable(),
    account_name: z.string().optional().nullable(),
    rate: z.number().optional().nullable(),
    quantity: z.number().optional().nullable(),
    tax_id: z.string().optional().nullable(),
    tax_name: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    item_total: z.number().optional().nullable()
});

const OutputSchema = z.object({
    bill_id: z.string().describe('Unique identifier of the created bill'),
    vendor_id: z.string().optional().nullable(),
    vendor_name: z.string().optional().nullable(),
    bill_number: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    total: z.number().optional().nullable(),
    balance: z.number().optional().nullable(),
    currency_id: z.string().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    line_items: z.array(LineItemOutputSchema).optional().nullable()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    bill: z.unknown()
});

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function optionalString(obj: Record<string, unknown>, key: string): { [k: string]: string } | undefined {
    const val = obj[key];
    if (val !== undefined && val !== null) {
        return { [key]: String(val) };
    }
    return undefined;
}

function optionalNumber(obj: Record<string, unknown>, key: string): { [k: string]: number } | undefined {
    const val = obj[key];
    if (typeof val === 'number') {
        return { [key]: val };
    }
    return undefined;
}

const action = createAction({
    description: 'Create a bill in Zoho Books',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-bill',
        group: 'Bills'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.bills.CREATE', 'ZohoBooks.settings.READ'],

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

        const body: Record<string, unknown> = {
            vendor_id: input.vendor_id,
            bill_number: input.bill_number,
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.due_date !== undefined && { due_date: input.due_date }),
            ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.line_items !== undefined && {
                line_items: input.line_items.map((item) => ({
                    ...(item.item_id !== undefined && { item_id: item.item_id }),
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.account_id !== undefined && { account_id: item.account_id }),
                    ...(item.rate !== undefined && { rate: item.rate }),
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
                    ...(item.unit !== undefined && { unit: item.unit })
                }))
            })
        };

        // https://www.zoho.com/books/api/v3/bills/#create-a-bill
        const response = await nango.post({
            endpoint: '/books/v3/bills',
            params: {
                organization_id: organizationId
            },
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0 || !providerResponse.bill) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Failed to create bill',
                code: providerResponse.code
            });
        }

        const bill = providerResponse.bill;

        if (!isObject(bill)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected bill response format'
            });
        }

        const lineItems = Array.isArray(bill['line_items'])
            ? bill['line_items']
                  .map((item: unknown) => {
                      if (!isObject(item)) {
                          return null;
                      }
                      return {
                          line_item_id: String(item['line_item_id'] ?? ''),
                          ...optionalString(item, 'item_id'),
                          ...optionalString(item, 'name'),
                          ...optionalString(item, 'description'),
                          ...optionalString(item, 'account_id'),
                          ...optionalString(item, 'account_name'),
                          ...optionalNumber(item, 'rate'),
                          ...optionalNumber(item, 'quantity'),
                          ...optionalString(item, 'tax_id'),
                          ...optionalString(item, 'tax_name'),
                          ...optionalString(item, 'unit'),
                          ...optionalNumber(item, 'item_total')
                      };
                  })
                  .filter((item): item is Exclude<typeof item, null> => item !== null)
            : [];

        if (!bill['bill_id'] || typeof bill['bill_id'] !== 'string') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return a valid bill_id.'
            });
        }

        return {
            bill_id: bill['bill_id'],
            ...optionalString(bill, 'vendor_id'),
            ...optionalString(bill, 'vendor_name'),
            ...optionalString(bill, 'bill_number'),
            ...optionalString(bill, 'status'),
            ...optionalString(bill, 'date'),
            ...optionalString(bill, 'due_date'),
            ...optionalNumber(bill, 'total'),
            ...optionalNumber(bill, 'balance'),
            ...optionalString(bill, 'currency_id'),
            ...optionalString(bill, 'currency_code'),
            ...optionalString(bill, 'reference_number'),
            ...optionalString(bill, 'notes'),
            ...(lineItems.length > 0 && { line_items: lineItems })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
