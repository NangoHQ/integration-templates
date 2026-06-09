import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    creditnote_id: z.string().describe('Unique identifier of the credit note. Example: "260815000000111002"'),
    organization_id: z.string().describe('ID of the organization. Example: "927270289"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a credit note in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-credit-note',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.creditnotes.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/credit-notes/#delete-a-credit-note
            endpoint: `/books/v3/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.code === 0,
            ...(providerResponse.message !== undefined && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
