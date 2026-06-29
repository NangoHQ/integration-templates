import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account identifier. Example: ZyQ04o')
});

const InputSchema = z.object({
    invoiceId: z.number().describe('Invoice ID to delete. Example: 453877')
});

const OutputSchema = z.object({
    success: z.boolean(),
    invoiceId: z.number()
});

const action = createAction({
    description: 'Delete (soft-delete) an invoice.',
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

        // https://www.freshbooks.com/api
        await nango.delete({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/invoices/invoices/${encodeURIComponent(String(input.invoiceId))}`,
            retries: 3
        });

        return {
            success: true,
            invoiceId: input.invoiceId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
