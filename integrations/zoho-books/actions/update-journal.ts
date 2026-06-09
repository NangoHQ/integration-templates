import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    journal_id: z.string().describe('Journal ID. Example: "260815000000115005"'),
    organization_id: z.string().describe('Organization ID. Example: "927270289"'),
    journal_date: z.string().describe('Date on which the journal is to be recorded. Example: "2026-06-09"'),
    reference_number: z.string().optional().describe('Reference number for the journal.'),
    notes: z.string().optional().describe('Notes for the journal.'),
    journal_type: z.enum(['Cash', 'Both']).optional().describe('Type of the journal. Allowed values: Cash, Both.'),
    currency_id: z.string().optional().describe('ID of the currency associated with the journal.'),
    exchange_rate: z.number().optional().describe('Exchange rate between the currencies.'),
    location_id: z.string().optional().describe('Location ID.'),
    line_items: z
        .array(
            z.object({
                account_id: z.string().optional().describe('ID of account for which journals are to be recorded.'),
                customer_id: z.string().optional().describe('ID of the customer or vendor.'),
                line_id: z.string().optional().describe('ID of the line.'),
                description: z.string().optional().describe('Description at the line item level.'),
                tax_id: z.string().optional().describe('ID of the tax.'),
                amount: z.number().describe('Amount to be recorded for the journal.'),
                debit_or_credit: z.enum(['debit', 'credit']).describe('Whether the account needs to be debited or credited.'),
                location_id: z.string().optional().describe('Location ID.'),
                project_id: z.string().optional().describe('ID of the project.')
            })
        )
        .optional()
        .describe('Line items for the journal.'),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string().describe('ID of the custom field.'),
                value: z.string().describe('Value of the custom field.')
            })
        )
        .optional()
        .describe('Custom fields for the journal.'),
    tags: z
        .array(
            z.object({
                tag_id: z.string().describe("Tag's ID."),
                tag_option_id: z.string().describe("Tag Option's ID.")
            })
        )
        .optional()
        .describe('Reporting tags for the journal.')
});

const ProviderLineItemSchema = z.object({
    line_id: z.string().optional(),
    account_id: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    debit_or_credit: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_type: z.string().optional(),
    tax_percentage: z.string().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    project_id: z.string().optional(),
    project_name: z.string().optional()
});

const ProviderJournalSchema = z.object({
    journal_id: z.string(),
    entry_number: z.string(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    exchange_rate: z.number().optional(),
    journal_date: z.string(),
    journal_type: z.string().optional(),
    vat_treatment: z.string().optional(),
    product_type: z.string().optional(),
    include_in_vat_return: z.boolean().optional(),
    is_bas_adjustment: z.boolean().optional(),
    line_items: z.array(ProviderLineItemSchema).optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    line_item_total: z.number().optional(),
    total: z.number().optional(),
    bcy_total: z.number().optional(),
    price_precision: z.number().optional(),
    taxes: z.array(z.object({}).passthrough()).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    status: z.string(),
    custom_fields: z.union([z.array(z.object({}).passthrough()), z.string()]).optional(),
    tags: z.union([z.array(z.object({}).passthrough()), z.string()]).optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    journal: ProviderJournalSchema
});

const OutputSchema = z.object({
    journal_id: z.string(),
    entry_number: z.string(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    journal_date: z.string(),
    journal_type: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    line_items: z
        .array(
            z.object({
                line_id: z.string().optional(),
                account_id: z.string().optional(),
                customer_id: z.string().optional(),
                customer_name: z.string().optional(),
                account_name: z.string().optional(),
                description: z.string().optional(),
                debit_or_credit: z.string().optional(),
                tax_id: z.string().optional(),
                tax_name: z.string().optional(),
                amount: z.number().optional(),
                location_id: z.string().optional(),
                location_name: z.string().optional(),
                project_id: z.string().optional(),
                project_name: z.string().optional()
            })
        )
        .optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    total: z.number().optional(),
    status: z.string(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const action = createAction({
    description: 'Update a manual journal entry in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-journal',
        group: 'Journals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.accountants.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            journal_date: input.journal_date,
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.journal_type !== undefined && { journal_type: input.journal_type }),
            ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.location_id !== undefined && { location_id: input.location_id }),
            ...(input.line_items !== undefined && {
                line_items: input.line_items.map((item) => ({
                    amount: item.amount,
                    debit_or_credit: item.debit_or_credit,
                    ...(item.account_id !== undefined && { account_id: item.account_id }),
                    ...(item.customer_id !== undefined && { customer_id: item.customer_id }),
                    ...(item.line_id !== undefined && { line_id: item.line_id }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
                    ...(item.location_id !== undefined && { location_id: item.location_id }),
                    ...(item.project_id !== undefined && { project_id: item.project_id })
                }))
            }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
            ...(input.tags !== undefined && { tags: input.tags })
        };

        const response = await nango.put({
            // https://www.zoho.com/books/api/v3/journals/#update-a-journal
            endpoint: `/books/v3/journals/${encodeURIComponent(input.journal_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data: body,
            retries: 1
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const journal = parsed.journal;

        return {
            journal_id: journal.journal_id,
            entry_number: journal.entry_number,
            ...(journal.reference_number !== undefined && { reference_number: journal.reference_number }),
            ...(journal.notes !== undefined && { notes: journal.notes }),
            journal_date: journal.journal_date,
            ...(journal.journal_type !== undefined && { journal_type: journal.journal_type }),
            ...(journal.currency_id !== undefined && { currency_id: journal.currency_id }),
            ...(journal.currency_code !== undefined && { currency_code: journal.currency_code }),
            ...(journal.exchange_rate !== undefined && { exchange_rate: journal.exchange_rate }),
            ...(journal.line_items !== undefined && {
                line_items: journal.line_items.map((item) => ({
                    ...(item.line_id !== undefined && { line_id: item.line_id }),
                    ...(item.account_id !== undefined && { account_id: item.account_id }),
                    ...(item.customer_id !== undefined && { customer_id: item.customer_id }),
                    ...(item.customer_name !== undefined && { customer_name: item.customer_name }),
                    ...(item.account_name !== undefined && { account_name: item.account_name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.debit_or_credit !== undefined && { debit_or_credit: item.debit_or_credit }),
                    ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
                    ...(item.tax_name !== undefined && { tax_name: item.tax_name }),
                    ...(item.amount !== undefined && { amount: item.amount }),
                    ...(item.location_id !== undefined && { location_id: item.location_id }),
                    ...(item.location_name !== undefined && { location_name: item.location_name }),
                    ...(item.project_id !== undefined && { project_id: item.project_id }),
                    ...(item.project_name !== undefined && { project_name: item.project_name })
                }))
            }),
            ...(journal.location_id !== undefined && { location_id: journal.location_id }),
            ...(journal.location_name !== undefined && { location_name: journal.location_name }),
            ...(journal.total !== undefined && { total: journal.total }),
            status: journal.status,
            ...(journal.created_time !== undefined && { created_time: journal.created_time }),
            ...(journal.last_modified_time !== undefined && { last_modified_time: journal.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
