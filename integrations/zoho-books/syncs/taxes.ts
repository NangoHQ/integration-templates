import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    organization_id: z.string()
});

const TaxSchema = z.object({
    id: z.string(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.number().optional(),
    tax_type: z.string().optional(),
    tax_factor: z.string().optional(),
    tax_specific_type: z.string().optional(),
    tax_authority_id: z.string().optional(),
    tax_authority_name: z.string().optional(),
    is_value_added: z.boolean().optional(),
    is_default_tax: z.boolean().optional(),
    is_editable: z.boolean().optional(),
    output_tax_account_name: z.string().optional(),
    purchase_tax_account_name: z.string().optional(),
    tax_account_id: z.string().optional(),
    purchase_tax_account_id: z.string().optional()
});

const ProviderTaxSchema = z.object({
    tax_id: z.string(),
    tax_name: z.string().nullish(),
    tax_percentage: z.number().nullish(),
    tax_type: z.string().nullish(),
    tax_factor: z.string().nullish(),
    tax_specific_type: z.string().nullish(),
    tax_authority_id: z.string().nullish(),
    tax_authority_name: z.string().nullish(),
    is_value_added: z.boolean().nullish(),
    is_default_tax: z.boolean().nullish(),
    is_editable: z.boolean().nullish(),
    output_tax_account_name: z.string().nullish(),
    purchase_tax_account_name: z.string().nullish(),
    tax_account_id: z.string().nullish(),
    purchase_tax_account_id: z.string().nullish()
});

const sync = createSync({
    description: 'Sync taxes configured in Zoho Books.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        Tax: TaxSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/taxes'
        }
    ],

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        // Blocker: the Zoho Books taxes endpoint only supports page-based
        // pagination with no modified_since filter, no cursor for changed
        // records, and no deleted-record endpoint.
        await nango.trackDeletesStart('Tax');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/taxes/
            endpoint: '/books/v3/settings/taxes',
            params: {
                organization_id: metadata.organization_id
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'taxes'
            },
            retries: 3
        };

        for await (const taxes of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderTaxSchema).safeParse(taxes);
            if (!parsed.success) {
                throw new Error(`Failed to parse taxes page: ${parsed.error.message}`);
            }

            const records = parsed.data.map((tax) => ({
                id: tax.tax_id,
                ...(tax.tax_id != null && { tax_id: tax.tax_id }),
                ...(tax.tax_name != null && { tax_name: tax.tax_name }),
                ...(tax.tax_percentage != null && { tax_percentage: tax.tax_percentage }),
                ...(tax.tax_type != null && { tax_type: tax.tax_type }),
                ...(tax.tax_factor != null && { tax_factor: tax.tax_factor }),
                ...(tax.tax_specific_type != null && { tax_specific_type: tax.tax_specific_type }),
                ...(tax.tax_authority_id != null && { tax_authority_id: tax.tax_authority_id }),
                ...(tax.tax_authority_name != null && { tax_authority_name: tax.tax_authority_name }),
                ...(tax.is_value_added != null && { is_value_added: tax.is_value_added }),
                ...(tax.is_default_tax != null && { is_default_tax: tax.is_default_tax }),
                ...(tax.is_editable != null && { is_editable: tax.is_editable }),
                ...(tax.output_tax_account_name != null && { output_tax_account_name: tax.output_tax_account_name }),
                ...(tax.purchase_tax_account_name != null && { purchase_tax_account_name: tax.purchase_tax_account_name }),
                ...(tax.tax_account_id != null && { tax_account_id: tax.tax_account_id }),
                ...(tax.purchase_tax_account_id != null && { purchase_tax_account_id: tax.purchase_tax_account_id })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Tax');
            }
        }

        await nango.trackDeletesEnd('Tax');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
