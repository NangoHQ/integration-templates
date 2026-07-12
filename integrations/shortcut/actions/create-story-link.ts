import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subject_id: z.number().describe('The ID of the story doing the linking. Example: 33'),
    object_id: z.number().describe('The ID of the story being linked to. Example: 34'),
    verb: z.enum(['blocks', 'duplicates', 'relates to']).describe('The relationship verb. Example: "blocks"')
});

const ProviderStoryLinkSchema = z.object({
    id: z.union([z.number(), z.string()]),
    subject_id: z.number(),
    object_id: z.number(),
    verb: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.union([z.number(), z.string()]),
    subject_id: z.number(),
    object_id: z.number(),
    verb: z.string()
});

const action = createAction({
    description: 'Link two stories with a relationship verb (blocks, duplicates, relates to).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shortcut.com/api/rest/v3#Create-Story-Link
        const response = await nango.post({
            endpoint: '/api/v3/story-links',
            data: {
                subject_id: input.subject_id,
                object_id: input.object_id,
                verb: input.verb
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create story link: empty response from Shortcut API.'
            });
        }

        const link = ProviderStoryLinkSchema.parse(response.data);

        return {
            id: link.id,
            subject_id: link.subject_id,
            object_id: link.object_id,
            verb: link.verb
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
