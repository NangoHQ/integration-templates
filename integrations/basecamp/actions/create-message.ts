import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        project_id: z.number().describe('The project (bucket) ID where the message board lives.'),
        message_board_id: z.number().describe('The message board ID under which to create the message.'),
        subject: z.string().describe('The title of the message.'),
        content: z.string().describe('The rich text body of the message.'),
        status: z.enum(['active', 'drafted']).optional().describe('Set to "active" to publish immediately. Omit to create a draft.'),
        category_id: z.number().optional().describe('Optional message type ID.'),
        subscriptions: z.array(z.number()).optional().describe('Optional array of person IDs to notify and subscribe.'),
        visible_to_clients: z.boolean().optional().describe('Whether the message is visible to clients. Defaults to false.')
    })
    .describe('Input for creating a message on a Basecamp message board.');

const ProviderMessageSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    inherits_status: z.boolean(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    content: z.string().optional(),
    subject: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the created message.'),
        status: z.string().describe('The status of the message, e.g. "active" or "drafted".'),
        visible_to_clients: z.boolean().describe('Whether the message is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp when the message was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the message was last updated.'),
        title: z.string().describe('The title of the message.'),
        content: z.string().optional().describe('The rich text body of the message.'),
        subject: z.string().optional().describe('The subject line of the message.'),
        url: z.string().describe('The API URL of the message.'),
        app_url: z.string().describe('The Basecamp app URL of the message.')
    })
    .describe('Output representing a newly created Basecamp message.');

/**
 * @tags: [write]
 * @tagReason: Creates a new message on a Basecamp message board.
 * @pitfalls: Omitting status creates a silent draft that is hidden from default listings and notifies no one; when published, omitting subscriptions subscribes and notifies every project member.
 */
const action = createAction({
    description: 'Create a message on a project message board.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            subject: input.subject,
            content: input.content
        };

        if (input.status !== undefined) {
            body['status'] = input.status;
        }

        if (input.category_id !== undefined) {
            body['category_id'] = input.category_id;
        }

        if (input.subscriptions !== undefined) {
            body['subscriptions'] = input.subscriptions;
        }

        if (input.visible_to_clients !== undefined) {
            body['visible_to_clients'] = input.visible_to_clients;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/messages.md#create-a-message
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(String(input.project_id))}/message_boards/${encodeURIComponent(String(input.message_board_id))}/messages.json`,
            data: body,
            retries: 3
        });

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            status: providerMessage.status,
            visible_to_clients: providerMessage.visible_to_clients,
            created_at: providerMessage.created_at,
            updated_at: providerMessage.updated_at,
            title: providerMessage.title,
            content: providerMessage.content,
            subject: providerMessage.subject,
            url: providerMessage.url,
            app_url: providerMessage.app_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
