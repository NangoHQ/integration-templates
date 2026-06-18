import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_id: z.string().describe('The unique identifier for the conversation to snooze. Example: "123"'),
    admin_id: z.string().describe('The ID of the admin performing the snooze action. Example: "456"'),
    snoozed_until: z.number().describe('Unix timestamp (seconds) when the conversation should be unsnoozed. Example: 1704067200')
});

const ProviderConversationSchema = z
    .object({
        type: z.string(),
        id: z.string(),
        created_at: z.number(),
        updated_at: z.number(),
        state: z.string(),
        snoozed_until: z.number().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    state: z.string(),
    snoozed_until: z.number().optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const action = createAction({
    description: 'Snooze a conversation until a given timestamp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_conversations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/createConversationPart
        const response = await nango.post({
            endpoint: `/conversations/${encodeURIComponent(input.conversation_id)}/parts`,
            data: {
                type: 'admin',
                message_type: 'snoozed',
                admin_id: input.admin_id,
                snoozed_until: input.snoozed_until
            },
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        const providerData = ProviderConversationSchema.parse(response.data);

        return {
            id: providerData.id,
            state: providerData.state,
            ...(providerData.snoozed_until !== null &&
                providerData.snoozed_until !== undefined && {
                    snoozed_until: providerData.snoozed_until
                }),
            created_at: providerData.created_at,
            updated_at: providerData.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
