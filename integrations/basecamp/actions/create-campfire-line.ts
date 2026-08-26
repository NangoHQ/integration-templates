import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID (bucket ID) that contains the Campfire.'),
        chatId: z.number().describe('Campfire (chat) ID to post the line to.'),
        content: z.string().describe('Plain text or HTML content of the Campfire line.'),
        contentType: z.string().optional().describe("Content type of the line. Use 'text/html' for rich text. Defaults to plain text.")
    })
    .describe('Input for creating a Campfire line.');

const CreatorSchema = z
    .object({
        id: z.number().describe('Person ID of the creator.'),
        name: z.string().describe('Display name of the creator.'),
        email_address: z.string().nullable().describe('Email address of the creator.')
    })
    .describe('Person who created the Campfire line.');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created Campfire line.'),
        content: z.string().describe('Content of the created line.'),
        type: z.string().describe('Type of the line, e.g. Chat::Lines::Text or Chat::Lines::RichText.'),
        created_at: z.string().describe('ISO 8601 timestamp when the line was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the line was last updated.'),
        url: z.string().describe('API URL of the created line.'),
        app_url: z.string().describe('Basecamp web app URL of the created line.'),
        creator: CreatorSchema.describe('Person who created the line.')
    })
    .describe('Output of a created Campfire line.');

const ProviderLineSchema = z.object({
    id: z.number(),
    content: z.string(),
    type: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    url: z.string(),
    app_url: z.string(),
    creator: z.object({
        id: z.number(),
        name: z.string(),
        email_address: z.string().nullable()
    })
});

/**
 * @tags: [write]
 * @tagReason: Posts a new line to a Campfire chat.
 * @pitfalls: HTML content is treated as plain text unless contentType is explicitly set to 'text/html'.
 */
const action = createAction({
    description: 'Post a line (message) to a Campfire.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: { content: string; content_type?: string } = {
            content: input.content
        };
        if (input.contentType !== undefined) {
            data.content_type = input.contentType;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/campfires.md#create-a-campfire-line
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/chats/${encodeURIComponent(String(input.chatId))}/lines.json`,
            data: data,
            retries: 3
        });

        const providerLine = ProviderLineSchema.parse(response.data);

        return {
            id: providerLine.id,
            content: providerLine.content,
            type: providerLine.type,
            created_at: providerLine.created_at,
            updated_at: providerLine.updated_at,
            url: providerLine.url,
            app_url: providerLine.app_url,
            creator: providerLine.creator
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
