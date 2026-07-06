import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account identifier. Example: ZyQ04o')
});

const InputSchema = z.object({
    invoiceId: z.number().describe('Invoice ID to archive. Example: 453877')
});

const ProviderInvoiceSchema = z.object({
    id: z.union([z.string(), z.number()]),
    vis_state: z.number().optional()
});

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.object({
            invoice: ProviderInvoiceSchema
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    vis_state: z.number().optional()
});

const action = createAction({
    description: 'Archive (soft-delete) an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:invoices:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        const { accountId } = parsedMetadata.data;

        // https://www.freshbooks.com/api/invoices
        const response = await nango.put({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/invoices/invoices/${encodeURIComponent(String(input.invoiceId))}`,
            data: {
                invoice: {
                    vis_state: 1
                }
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }

        const invoice = parsedResponse.data.response.result.invoice;

        return {
            id: String(invoice.id),
            ...(invoice.vis_state !== undefined && { vis_state: invoice.vis_state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
