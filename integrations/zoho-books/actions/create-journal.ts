import { z } from 'zod';
import { createAction } from 'nango';

const JournalLineItemSchema = z.object({
    account_id: z.string().describe('ID of the account for this line item. Example: "260815000000000388"'),
    debit_or_credit: z.enum(['debit', 'credit']).describe('Whether this line is a debit or credit.'),
    amount: z.number().describe('Amount for this line item.'),
    description: z.string().optional().describe('Description for this line item.'),
    customer_id: z.string().optional().describe('Customer ID (required for AR accounts).'),
    vendor_id: z.string().optional().describe('Vendor ID (required for AP accounts).'),
    tax_id: z.string().optional().describe('ID of the tax.'),
    project_id: z.string().optional().describe('ID of the project.'),
    location_id: z.string().optional().describe('Location ID.')
});

const InputSchema = z.object({
    journal_date: z.string().describe('Date of the journal entry in YYYY-MM-DD format. Example: "2026-06-09"'),
    reference_number: z.string().optional().describe('Reference number for the journal.'),
    notes: z.string().optional().describe('Notes for the journal.'),
    journal_type: z.enum(['Cash', 'Both']).optional().describe('Type of the journal.'),
    currency_id: z.string().optional().describe('ID of the currency associated with the journal.'),
    exchange_rate: z.number().optional().describe('Exchange rate between currencies.'),
    line_items: z
        .array(JournalLineItemSchema)
        .min(2)
        .describe('Line items for the journal. Must have at least 2 lines and total debits must equal total credits.')
});

const ProviderJournalLineItemSchema = z.object({
    line_id: z.string().optional(),
    account_id: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    debit_or_credit: z.string().optional(),
    tax_exemption_id: z.string().optional(),
    tax_exemption_type: z.string().optional(),
    tax_exemption_code: z.string().optional(),
    tax_authority_id: z.string().optional(),
    tax_authority_name: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_type: z.string().optional(),
    tax_percentage: z.string().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    acquisition_vat_id: z.string().optional(),
    acquisition_vat_name: z.string().optional(),
    acquisition_vat_percentage: z.string().optional(),
    acquisition_vat_amount: z.string().optional(),
    reverse_charge_vat_id: z.string().optional(),
    reverse_charge_vat_name: z.string().optional(),
    reverse_charge_vat_percentage: z.string().optional(),
    reverse_charge_vat_amount: z.string().optional(),
    tags: z
        .array(
            z.object({
                tag_id: z.string().optional(),
                tag_option_id: z.string().optional()
            })
        )
        .optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    project_id: z.string().optional(),
    project_name: z.string().optional()
});

const ProviderJournalSchema = z.object({
    journal_id: z.string().optional(),
    entry_number: z.string().optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    exchange_rate: z.number().optional(),
    journal_date: z.string().optional(),
    journal_type: z.string().optional(),
    vat_treatment: z.string().optional(),
    product_type: z.string().optional(),
    include_in_vat_return: z.boolean().optional(),
    is_bas_adjustment: z.boolean().optional(),
    line_items: z.array(ProviderJournalLineItemSchema).optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    line_item_total: z.number().optional(),
    total: z.number().optional(),
    bcy_total: z.number().optional(),
    price_precision: z.number().optional(),
    taxes: z
        .array(
            z.object({
                tax_name: z.string().optional(),
                tax_amount: z.number().optional(),
                debit_or_credit: z.string().optional(),
                tax_account: z.boolean().optional()
            })
        )
        .optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    status: z.string().optional(),
    custom_fields: z
        .union([
            z.string(),
            z.array(
                z.object({
                    customfield_id: z.string().optional(),
                    value: z.string().optional()
                })
            )
        ])
        .optional(),
    tags: z
        .array(
            z.object({
                tag_id: z.string().optional(),
                tag_name: z.string().optional(),
                tag_option_id: z.string().optional(),
                tag_option_name: z.string().optional(),
                is_tag_mandatory: z.boolean().optional()
            })
        )
        .optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    journal: ProviderJournalSchema.optional()
});

const OutputSchema = z.object({
    journal_id: z.string().optional(),
    entry_number: z.string().optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    journal_date: z.string().optional(),
    journal_type: z.string().optional(),
    status: z.string().optional(),
    total: z.number().optional(),
    line_items: z
        .array(
            z.object({
                line_id: z.string().optional(),
                account_id: z.string().optional(),
                account_name: z.string().optional(),
                description: z.string().optional(),
                debit_or_credit: z.string().optional(),
                amount: z.number().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a manual journal entry in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-journal',
        group: 'Journals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.accountants.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const totalDebits = input.line_items.filter((item) => item.debit_or_credit === 'debit').reduce((sum, item) => sum + item.amount, 0);
        const totalCredits = input.line_items.filter((item) => item.debit_or_credit === 'credit').reduce((sum, item) => sum + item.amount, 0);

        if (totalDebits !== totalCredits) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Total debits must equal total credits.',
                total_debits: totalDebits,
                total_credits: totalCredits
            });
        }

        const metadata = await nango.getMetadata();
        const metadataResult = z
            .object({
                organization_id: z.string().optional()
            })
            .safeParse(metadata);
        const organizationId = metadataResult.success ? metadataResult.data.organization_id : undefined;

        if (!organizationId) {
            throw new nango.ActionError({
                type: 'missing_organization_id',
                message: 'organization_id is required in metadata.'
            });
        }

        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/journals/#create-a-journal
            endpoint: '/books/v3/journals',
            params: {
                organization_id: organizationId
            },
            data: {
                journal_date: input.journal_date,
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.journal_type !== undefined && { journal_type: input.journal_type }),
                ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
                ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
                line_items: input.line_items.map((item) => ({
                    account_id: item.account_id,
                    debit_or_credit: item.debit_or_credit,
                    amount: item.amount,
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.customer_id !== undefined && { customer_id: item.customer_id }),
                    ...(item.vendor_id !== undefined && { vendor_id: item.vendor_id }),
                    ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
                    ...(item.project_id !== undefined && { project_id: item.project_id }),
                    ...(item.location_id !== undefined && { location_id: item.location_id })
                }))
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const journal = providerResponse.journal;

        if (!journal) {
            throw new nango.ActionError({
                type: 'missing_journal',
                message: 'Journal was not returned in the provider response.'
            });
        }

        return {
            ...(journal.journal_id !== undefined && { journal_id: journal.journal_id }),
            ...(journal.entry_number !== undefined && { entry_number: journal.entry_number }),
            ...(journal.reference_number !== undefined && { reference_number: journal.reference_number }),
            ...(journal.notes !== undefined && { notes: journal.notes }),
            ...(journal.journal_date !== undefined && { journal_date: journal.journal_date }),
            ...(journal.journal_type !== undefined && { journal_type: journal.journal_type }),
            ...(journal.status !== undefined && { status: journal.status }),
            ...(journal.total !== undefined && { total: journal.total }),
            ...(journal.line_items !== undefined && {
                line_items: journal.line_items.map((item) => ({
                    ...(item.line_id !== undefined && { line_id: item.line_id }),
                    ...(item.account_id !== undefined && { account_id: item.account_id }),
                    ...(item.account_name !== undefined && { account_name: item.account_name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.debit_or_credit !== undefined && { debit_or_credit: item.debit_or_credit }),
                    ...(item.amount !== undefined && { amount: item.amount })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
