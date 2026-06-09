import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The invoice ID to delete. Example: "260815000000101011"')
});

const MetadataSchema = z.object({
    organization_id: z.string().describe('The Zoho Books organization ID. Example: "927270289"')
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string()
});

const action = createAction({
    description: 'Delete or archive an invoice in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.invoices.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const organizationId = metadata && typeof metadata === 'object' && 'organization_id' in metadata ? metadata.organization_id : undefined;

        if (!organizationId || typeof organizationId !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/invoices/#delete-an-invoice
            endpoint: `/books/v3/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 1
        });

        const body = z
            .object({
                code: z.number(),
                message: z.string()
            })
            .parse(response.data);

        return {
            code: body.code,
            message: body.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
