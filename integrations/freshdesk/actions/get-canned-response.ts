import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the canned response. Example: 82000005490')
    })
    .describe('Input to retrieve a single canned response from Freshdesk.');

const ProviderAttachmentSchema = z
    .object({
        id: z.number().optional(),
        content_type: z.string().optional(),
        file_size: z.number().optional(),
        name: z.string().optional(),
        attachment_url: z.string().optional()
    })
    .passthrough();

const ProviderCannedResponseSchema = z.object({
    id: z.number(),
    title: z.string().nullable(),
    folder_id: z.number().nullable(),
    content: z.string().nullable(),
    content_html: z.string().nullable(),
    attachments: z.array(ProviderAttachmentSchema).nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the canned response.'),
        title: z.string().optional().describe('The title of the canned response.'),
        folder_id: z.number().optional().describe('The ID of the folder containing the canned response.'),
        content: z.string().optional().describe('The plain text content of the canned response.'),
        content_html: z.string().optional().describe('The HTML content of the canned response.'),
        attachments: z
            .array(
                z
                    .object({
                        id: z.number().optional().describe('The unique identifier of the attachment.'),
                        content_type: z.string().optional().describe('The MIME type of the attachment.'),
                        file_size: z.number().optional().describe('The file size of the attachment in bytes.'),
                        name: z.string().optional().describe('The name of the attachment file.'),
                        attachment_url: z.string().optional().describe('The URL to download the attachment.')
                    })
                    .passthrough()
            )
            .optional()
            .describe('List of attachments associated with the canned response.'),
        created_at: z.string().optional().describe('The creation timestamp in UTC ISO 8601 format.'),
        updated_at: z.string().optional().describe('The last update timestamp in UTC ISO 8601 format.')
    })
    .describe('A canned response from Freshdesk.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single canned response by ID from Freshdesk.
 * @pitfalls: Output omits provider fields such as short_code, group_ids, and visibility that the API returns alongside the documented shape.
 */
const action = createAction({
    description: 'Retrieve a single canned response from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_canned_response
            endpoint: `/api/v2/canned_responses/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Canned response not found',
                id: input.id
            });
        }

        const providerCannedResponse = ProviderCannedResponseSchema.parse(response.data);

        return {
            id: providerCannedResponse.id,
            ...(providerCannedResponse.title != null && { title: providerCannedResponse.title }),
            ...(providerCannedResponse.folder_id != null && { folder_id: providerCannedResponse.folder_id }),
            ...(providerCannedResponse.content != null && { content: providerCannedResponse.content }),
            ...(providerCannedResponse.content_html != null && { content_html: providerCannedResponse.content_html }),
            ...(providerCannedResponse.attachments != null && {
                attachments: providerCannedResponse.attachments.map((attachment) => ({
                    ...(attachment.id != null && { id: attachment.id }),
                    ...(attachment.content_type != null && { content_type: attachment.content_type }),
                    ...(attachment.file_size != null && { file_size: attachment.file_size }),
                    ...(attachment.name != null && { name: attachment.name }),
                    ...(attachment.attachment_url != null && { attachment_url: attachment.attachment_url })
                }))
            }),
            ...(providerCannedResponse.created_at != null && { created_at: providerCannedResponse.created_at }),
            ...(providerCannedResponse.updated_at != null && { updated_at: providerCannedResponse.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
