import { createSync } from 'nango';
import { z } from 'zod';

const ProviderFolderSchema = z.object({
    id: z.number(),
    name: z.string(),
    personal: z.boolean(),
    responses_count: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

type ProviderFolder = z.infer<typeof ProviderFolderSchema>;

const ProviderAttachmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    content_type: z.string(),
    size: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    attachment_url: z.string(),
    thumb_url: z.string().optional().nullable()
});

const ProviderCannedResponseSchema = z.object({
    id: z.number(),
    title: z.string(),
    folder_id: z.number(),
    content: z.string().optional().nullable(),
    content_html: z.string().optional().nullable(),
    attachments: z.array(ProviderAttachmentSchema).optional().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const CannedResponseSchema = z
    .object({
        id: z.string().describe('Unique identifier of the canned response'),
        title: z.string().describe('Title of the canned response'),
        folder_id: z.number().describe('ID of the folder containing this canned response'),
        folder_name: z.string().optional().describe('Name of the folder containing this canned response'),
        content: z.string().optional().describe('Plaintext version of the canned response content'),
        content_html: z.string().optional().describe('HTML version of the canned response content'),
        attachments: z
            .array(
                z.object({
                    id: z.number().describe('Unique identifier of the attachment'),
                    name: z.string().describe('Name of the attachment file'),
                    content_type: z.string().describe('MIME type of the attachment'),
                    size: z.number().describe('Size of the attachment in bytes'),
                    created_at: z.string().describe('Timestamp when the attachment was created'),
                    updated_at: z.string().describe('Timestamp when the attachment was last updated'),
                    attachment_url: z.string().describe('URL to download the attachment'),
                    thumb_url: z.string().optional().describe('Thumbnail URL for the attachment')
                })
            )
            .optional()
            .describe('Attachments associated with the canned response'),
        created_at: z.string().describe('Timestamp when the canned response was created'),
        updated_at: z.string().describe('Timestamp when the canned response was last updated')
    })
    .describe('A predefined reply template from a Freshdesk canned response folder');

type CannedResponse = z.infer<typeof CannedResponseSchema>;

const sync = createSync({
    description: 'Recursively fetches canned responses from Freshdesk canned response folders.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CannedResponse: CannedResponseSchema
    },

    // Blocker: provider only exposes /api/v2/canned_response_folders and
    // /api/v2/canned_response_folders/{id}/responses with no changed-since
    // filter and no deleted-record endpoint. Delete-tracked syncs must always complete a
    // full enumeration per Nango requirements, so there is no resumable checkpoint here:
    // an interrupted run is retried from the first folder on the next execution.
    exec: async (nango) => {
        const folders: ProviderFolder[] = [];

        // https://developers.freshdesk.com/api/#list_all_canned_response_folders
        for await (const batch of nango.paginate({
            endpoint: '/api/v2/canned_response_folders',
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        })) {
            for (const raw of batch) {
                const parsed = ProviderFolderSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse folder: ${parsed.error.message}`);
                }
                folders.push(parsed.data);
            }
        }

        await nango.trackDeletesStart('CannedResponse');

        for (const folder of folders) {
            const responses: CannedResponse[] = [];

            // https://developers.freshdesk.com/api/#get_details_of_canned_responses_in_folders
            for await (const batch of nango.paginate({
                endpoint: `/api/v2/canned_response_folders/${encodeURIComponent(String(folder.id))}/responses`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            })) {
                for (const raw of batch) {
                    const parsed = ProviderCannedResponseSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse canned response: ${parsed.error.message}`);
                    }
                    const providerResponse = parsed.data;
                    responses.push({
                        id: String(providerResponse.id),
                        title: providerResponse.title,
                        folder_id: providerResponse.folder_id,
                        folder_name: folder.name,
                        ...(providerResponse.content != null && { content: providerResponse.content }),
                        ...(providerResponse.content_html != null && { content_html: providerResponse.content_html }),
                        ...(providerResponse.attachments != null && {
                            attachments: providerResponse.attachments.map((att) => ({
                                id: att.id,
                                name: att.name,
                                content_type: att.content_type,
                                size: att.size,
                                created_at: att.created_at,
                                updated_at: att.updated_at,
                                attachment_url: att.attachment_url,
                                ...(att.thumb_url != null && { thumb_url: att.thumb_url })
                            }))
                        }),
                        created_at: providerResponse.created_at,
                        updated_at: providerResponse.updated_at
                    });
                }
            }

            if (responses.length > 0) {
                await nango.batchSave(responses, 'CannedResponse');
            }
        }

        await nango.trackDeletesEnd('CannedResponse');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
