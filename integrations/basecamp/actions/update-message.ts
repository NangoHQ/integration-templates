import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The project (bucket) ID that contains the message. Example: "48644099"'),
        messageId: z.string().describe('The ID of the message to update. Example: "1069480022"'),
        subject: z.string().optional().describe('The new subject (title) of the message.'),
        content: z.string().optional().describe('The new body content of the message. Allowed HTML tags are documented in the Basecamp rich-text guide.'),
        categoryId: z.string().optional().describe('The ID of the message category (type) to assign.')
    })
    .describe('Input parameters for updating a Basecamp message.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the message.'),
        status: z.string().describe('The current status of the message. Example: "active" or "drafted".'),
        subject: z.string().describe('The subject (title) of the message.'),
        content: z.string().optional().describe('The body content of the message.'),
        updated_at: z.string().describe('ISO 8601 timestamp of the last update.'),
        created_at: z.string().describe('ISO 8601 timestamp of creation.')
    })
    .describe('The updated Basecamp message.');

const ProviderMessageSchema = z
    .object({
        id: z.number(),
        status: z.string(),
        subject: z.string(),
        content: z.string().optional(),
        updated_at: z.string(),
        created_at: z.string()
    })
    .passthrough();

/**
 * @tags: [write]
 * @tagReason: Updates an existing message on the provider by sending a PUT request.
 * @pitfalls: Updating a message automatically adds the caller to its subscriber list.
 */
const action = createAction({
    description: "Update a message's subject, content, or category.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: { subject?: string; content?: string; category_id?: string } = {};
        if (input.subject !== undefined) {
            data.subject = input.subject;
        }
        if (input.content !== undefined) {
            data.content = input.content;
        }
        if (input.categoryId !== undefined) {
            data.category_id = input.categoryId;
        }

        const response = await nango.put({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/messages.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/messages/${encodeURIComponent(input.messageId)}.json`,
            data,
            retries: 3
        });

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            status: providerMessage.status,
            subject: providerMessage.subject,
            ...(providerMessage.content !== undefined && { content: providerMessage.content }),
            updated_at: providerMessage.updated_at,
            created_at: providerMessage.created_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
