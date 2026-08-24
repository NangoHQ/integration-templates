import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        title: z.string().describe('Title of the canned response.'),
        content_html: z.string().describe('HTML version of the canned response content.'),
        folder_id: z.number().describe('Folder ID where the canned response gets added.'),
        visibility: z
            .union([z.literal(0), z.literal(1), z.literal(2)])
            .describe('Visibility of the canned response. 0 = visible to all agents, 1 = personal, 2 = visible to select groups.'),
        group_ids: z.array(z.number()).optional().describe('Group IDs for which the canned response is visible. Use only when visibility is set to 2.'),
        attachments: z
            .array(z.object({}).passthrough())
            .optional()
            .describe('Attachments associated with the canned response. Total size must not exceed 20MB.')
    })
    .describe('Input to create a canned response in Freshdesk.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the canned response.'),
        title: z.string().describe('Title of the canned response.'),
        folder_id: z.number().describe('Folder ID where the canned response is stored.'),
        content: z.string().optional().describe('Plain-text content of the canned response.'),
        content_html: z.string().optional().describe('HTML content of the canned response.'),
        attachments: z.array(z.object({}).passthrough()).optional().describe('Attachments associated with the canned response.'),
        short_code: z.string().optional().describe('Short code used to quickly insert the canned response.'),
        group_ids: z.array(z.number()).optional().describe('Group IDs for which the canned response is visible. Only effective when visibility is 2.'),
        visibility: z.number().optional().describe('Visibility of the canned response. 0 = all agents, 1 = personal, 2 = selected groups.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the canned response was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the canned response was last updated.')
    })
    .describe('Output of a newly created canned response in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new canned response in Freshdesk.
 * @pitfalls: folder_id must refer to an existing canned-response folder or the request fails with a 400 error. group_ids is only effective when visibility is set to 2.
 */
const action = createAction({
    description: 'Create a canned response in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            title: input.title,
            content_html: input.content_html,
            folder_id: input.folder_id,
            visibility: input.visibility,
            ...(input.group_ids !== undefined && { group_ids: input.group_ids }),
            ...(input.attachments !== undefined && { attachments: input.attachments })
        };

        // https://developers.freshdesk.com/api/#create_canned_response
        const response = await nango.post({
            endpoint: '/api/v2/canned_responses',
            data: payload,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const providerResponse = z
            .object({
                id: z.number(),
                title: z.string(),
                folder_id: z.number(),
                content: z.string().optional(),
                content_html: z.string().optional(),
                attachments: z.array(z.object({}).passthrough()).optional(),
                short_code: z.string().nullable().optional(),
                group_ids: z.array(z.number()).nullable().optional(),
                visibility: z.number().nullable().optional(),
                created_at: z.string().optional(),
                updated_at: z.string().optional()
            })
            .parse(response.data);

        return {
            id: providerResponse.id,
            title: providerResponse.title,
            folder_id: providerResponse.folder_id,
            ...(providerResponse.content !== undefined && { content: providerResponse.content }),
            ...(providerResponse.content_html !== undefined && { content_html: providerResponse.content_html }),
            ...(providerResponse.attachments !== undefined && { attachments: providerResponse.attachments }),
            ...(providerResponse.short_code != null && { short_code: providerResponse.short_code }),
            ...(providerResponse.group_ids != null && { group_ids: providerResponse.group_ids }),
            ...(providerResponse.visibility != null && { visibility: providerResponse.visibility }),
            ...(providerResponse.created_at !== undefined && { created_at: providerResponse.created_at }),
            ...(providerResponse.updated_at !== undefined && { updated_at: providerResponse.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
