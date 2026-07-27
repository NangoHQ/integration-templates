import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Candidate ID. Example: "27273038"'),
    tags: z.array(z.string()).describe('Tag list to set. Empty array clears all tags.')
});

const ProviderResponseSchema = z.object({
    tags: z.array(z.string())
});

const OutputSchema = z.object({
    id: z.string(),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: "Replace a candidate's tag list.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://workable.readme.io/reference/tag-candidate
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}/tags`,
            data: {
                tags: input.tags
            },
            retries: 2
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: input.id,
            tags: providerResponse.tags
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
