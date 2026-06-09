import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('Invoice ID to void. Example: "260815000000103001"')
});

const MetadataSchema = z.object({
    organization_id: z.string()
});

const ProviderVoidResponseSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Void a Zoho Books invoice.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/void-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in connection metadata.'
            });
        }

        const organizationId = metadataResult.data.organization_id;

        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/invoices/#void-an-invoice
            endpoint: `/books/v3/invoices/${encodeURIComponent(input.invoice_id)}/status/void`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderVoidResponseSchema.parse(response.data);

        return {
            ...(providerResponse.invoice_id !== undefined && { invoice_id: providerResponse.invoice_id }),
            ...(providerResponse.invoice_number !== undefined && { invoice_number: providerResponse.invoice_number }),
            ...(providerResponse.status !== undefined && { status: providerResponse.status }),
            ...(providerResponse.message !== undefined && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
