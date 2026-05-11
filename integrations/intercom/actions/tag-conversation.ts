import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_id: z.string().describe('The unique identifier for the conversation to tag. Example: "123"'),
    tag_id: z.string().describe('The unique identifier for the tag to apply. Example: "456"'),
    admin_id: z.string().describe('The unique identifier for the admin applying the tag. Example: "789"')
});

const ProviderTagSchema = z.object({
    id: z.string(),
    name: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string()
});

const action = createAction({
    description: 'Apply a tag to a conversation.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/tag-conversation',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Tags
        const response = await nango.post({
            endpoint: `/conversations/${encodeURIComponent(input.conversation_id)}/tags`,
            data: {
                id: input.tag_id,
                admin_id: input.admin_id
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        const providerTag = ProviderTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            name: providerTag.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
