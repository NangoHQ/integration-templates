import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    term: z.string().describe('Input term to get suggestions for. Example: "sport"'),
    limit: z.number().int().min(1).max(10).optional().describe('Max suggested terms to return. Default: 4, Maximum: 10')
});

const OutputSchema = z.object({
    terms: z.array(z.string())
});

const action = createAction({
    description: 'Get suggested search terms.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/terms_suggested/get
            endpoint: '/v5/terms/suggested',
            params: {
                term: input.term,
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = z.array(z.string()).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                details: parsed.error.message
            });
        }

        return {
            terms: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
