import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    terms: z.string().describe('The term to find related terms for. Example: "coffee"')
});

const RelatedTermsListItemSchema = z.object({
    term: z.string().optional(),
    related_terms: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    related_term_count: z.number().optional(),
    related_terms_list: z.array(RelatedTermsListItemSchema).optional()
});

const action = createAction({
    description: 'Get terms related to a given term.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/terms_related/list
            endpoint: '/v5/terms/related',
            params: {
                terms: input.terms
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
