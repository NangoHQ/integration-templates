import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    organization_id: z.string().describe('Zoho Books organization ID. Example: "927270289"')
});

const InputSchema = z.object({
    journal_id: z.string().describe('ID of the journal to retrieve. Example: "260815000000115005"')
});

const JournalLineItemSchema = z
    .object({
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
                z
                    .object({
                        tag_id: z.string().optional(),
                        tag_option_id: z.string().optional()
                    })
                    .passthrough()
            )
            .optional(),
        location_id: z.string().optional(),
        location_name: z.string().optional(),
        project_id: z.string().optional(),
        project_name: z.string().optional()
    })
    .passthrough();

const TaxSchema = z
    .object({
        tax_name: z.string().optional(),
        tax_amount: z.number().optional(),
        debit_or_credit: z.string().optional(),
        tax_account: z.boolean().optional()
    })
    .passthrough();

const CustomFieldSchema = z
    .object({
        customfield_id: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const TagSchema = z
    .object({
        tag_id: z.string().optional(),
        tag_name: z.string().optional(),
        tag_option_id: z.string().optional(),
        tag_option_name: z.string().optional(),
        is_tag_mandatory: z.boolean().optional()
    })
    .passthrough();

const ProviderJournalSchema = z
    .object({
        journal_id: z.string(),
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
        line_items: z.array(JournalLineItemSchema).optional(),
        location_id: z.string().optional(),
        location_name: z.string().optional(),
        line_item_total: z.number().optional(),
        total: z.number().optional(),
        bcy_total: z.number().optional(),
        price_precision: z.number().optional(),
        taxes: z.array(TaxSchema).optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional(),
        status: z.string().optional(),
        custom_fields: z.union([z.array(CustomFieldSchema), z.string()]).optional(),
        tags: z.array(TagSchema).optional()
    })
    .passthrough();

const OutputSchema = ProviderJournalSchema;

const action = createAction({
    description: 'Retrieve a single manual journal entry from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-journal'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.accountants.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }
        const organizationId = parsedMetadata.data.organization_id;

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/journals/#get-journal
            endpoint: `/books/v3/journals/${encodeURIComponent(input.journal_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                code: z.number(),
                message: z.string(),
                journal: ProviderJournalSchema
            })
            .parse(response.data);

        return providerResponse.journal;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
