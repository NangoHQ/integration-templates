import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Bite ID. Example: "bite_abc123"')
});

const ProviderBiteSchema = z.object({
    id: z.string(),
    transcript_id: z.string().optional(),
    name: z.string().optional(),
    thumbnail: z.string().nullish(),
    preview: z.string().nullish(),
    status: z.string().optional(),
    summary: z.string().nullish(),
    user_id: z.string().optional(),
    start_time: z.number().optional(),
    end_time: z.number().optional(),
    summary_status: z.string().optional(),
    media_type: z.string().optional(),
    created_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            bite: ProviderBiteSchema.nullable().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    transcript_id: z.string().optional(),
    name: z.string().optional(),
    thumbnail: z.string().optional(),
    preview: z.string().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    user_id: z.string().optional(),
    start_time: z.number().optional(),
    end_time: z.number().optional(),
    summary_status: z.string().optional(),
    media_type: z.string().optional(),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a specific bite/soundbite by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/query/bite
            endpoint: '/graphql',
            data: {
                query: 'query Bite($biteId: ID!) { bite(id: $biteId) { id transcript_id name thumbnail preview status summary user_id start_time end_time summary_status media_type created_at } }',
                variables: { biteId: input.id }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerBite = providerResponse.data?.bite;

        if (!providerBite) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Bite not found',
                id: input.id
            });
        }

        return {
            id: providerBite.id,
            ...(providerBite.transcript_id != null && { transcript_id: providerBite.transcript_id }),
            ...(providerBite.name != null && { name: providerBite.name }),
            ...(providerBite.thumbnail != null && { thumbnail: providerBite.thumbnail }),
            ...(providerBite.preview != null && { preview: providerBite.preview }),
            ...(providerBite.status != null && { status: providerBite.status }),
            ...(providerBite.summary != null && { summary: providerBite.summary }),
            ...(providerBite.user_id != null && { user_id: providerBite.user_id }),
            ...(providerBite.start_time != null && { start_time: providerBite.start_time }),
            ...(providerBite.end_time != null && { end_time: providerBite.end_time }),
            ...(providerBite.summary_status != null && { summary_status: providerBite.summary_status }),
            ...(providerBite.media_type != null && { media_type: providerBite.media_type }),
            ...(providerBite.created_at != null && { created_at: providerBite.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
