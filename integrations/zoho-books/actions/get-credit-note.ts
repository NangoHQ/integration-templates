import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    creditnote_id: z.string().describe('Credit Note ID. Example: "260815000000111002"')
});

const CreditNoteSchema = z.record(z.string(), z.unknown());

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    creditnote: CreditNoteSchema
});

const action = createAction({
    description: 'Retrieve a single credit note from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-credit-note'
    },
    input: InputSchema,
    output: CreditNoteSchema,
    scopes: ['ZohoBooks.creditnotes.READ'],

    exec: async (nango, input): Promise<z.infer<typeof CreditNoteSchema>> => {
        // https://www.zoho.com/books/api/v3/credit-notes/#get-a-credit-note
        const response = await nango.get({
            endpoint: `/books/v3/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: '927270289'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return providerResponse.creditnote;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
