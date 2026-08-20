import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('ID of the canned response to update. Example: 35000093982'),
        title: z.string().optional().describe('Title of the canned response.'),
        content_html: z.string().optional().describe('HTML version of the canned response content.'),
        folder_id: z.number().optional().describe('Folder ID where the canned response should be placed.'),
        visibility: z
            .union([z.literal(0), z.literal(1), z.literal(2)])
            .optional()
            .describe('Visibility of the canned response. 0 = visible to all agents, 1 = personal, 2 = visible to select groups.'),
        group_ids: z.array(z.number()).optional().describe('Group IDs for which the canned response is visible. Only effective when visibility is set to 2.')
    })
    .describe('Input to update an existing canned response in Freshdesk.');

const ProviderCannedResponseSchema = z.object({
    id: z.number(),
    title: z.string(),
    folder_id: z.number(),
    content: z.string(),
    content_html: z.string(),
    attachments: z.array(z.unknown()),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the canned response.'),
        title: z.string().describe('Title of the canned response.'),
        folder_id: z.number().describe('Folder ID where the canned response resides.'),
        content: z.string().describe('Plain text version of the canned response content.'),
        content_html: z.string().describe('HTML version of the canned response content.'),
        attachments: z.array(z.unknown()).describe('Attachments associated with the canned response.'),
        created_at: z.string().describe('ISO 8601 timestamp when the canned response was created. Example: 2020-08-24T06:53:36Z'),
        updated_at: z.string().describe('ISO 8601 timestamp when the canned response was last updated. Example: 2020-08-24T06:58:36Z')
    })
    .describe('Updated canned response returned by Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing canned response on the provider.
 * @pitfalls: group_ids has no effect unless visibility is set to 2.
 */
const action = createAction({
    description: 'Update a canned response in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_canned_response
            endpoint: `/api/v2/canned_responses/${encodeURIComponent(String(input.id))}`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.content_html !== undefined && { content_html: input.content_html }),
                ...(input.folder_id !== undefined && { folder_id: input.folder_id }),
                ...(input.visibility !== undefined && { visibility: input.visibility }),
                ...(input.group_ids !== undefined && { group_ids: input.group_ids })
            },
            retries: 10
        });

        const providerResponse = ProviderCannedResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            title: providerResponse.title,
            folder_id: providerResponse.folder_id,
            content: providerResponse.content,
            content_html: providerResponse.content_html,
            attachments: providerResponse.attachments,
            created_at: providerResponse.created_at,
            updated_at: providerResponse.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
