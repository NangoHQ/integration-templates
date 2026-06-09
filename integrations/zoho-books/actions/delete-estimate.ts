import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    estimate_id: z.string().describe('Unique identifier of the estimate to delete. Example: "260815000000101017"'),
    organization_id: z.string().describe('ID of the Zoho Books organization. Example: "927270289"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string()
});

const action = createAction({
    description: 'Delete or archive an estimate in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-estimate',
        group: 'Estimates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.estimates.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/books/api/v3/estimates/#delete-an-estimate
        const response = await nango.delete({
            endpoint: `/books/v3/estimates/${encodeURIComponent(input.estimate_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            code: providerResponse.code,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
