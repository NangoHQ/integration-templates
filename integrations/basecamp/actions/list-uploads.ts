import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID (bucket ID). Example: 48644099'),
        vaultId: z.number().describe('Vault ID (dock tool ID). Example: 10239340939')
    })
    .describe('Input for listing uploads in a Basecamp vault.');

const UploadSchema = z
    .object({
        id: z.number().describe('Upload ID.'),
        status: z.string().describe('Status of the upload (e.g., active, drafted, trashed, archived).'),
        visible_to_clients: z.boolean().describe('Whether the upload is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp when the upload was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the upload was last updated.'),
        title: z.string().describe('Title of the upload.'),
        inherits_status: z.boolean().describe('Whether the upload inherits status from its parent.'),
        type: z.string().describe('Type of the resource (e.g., Upload).'),
        url: z.string().describe('API URL for the upload.'),
        app_url: z.string().describe('Basecamp app URL for the upload.'),
        bookmark_url: z.string().describe('Bookmark URL for the upload.'),
        subscription_url: z.string().describe('Subscription URL for the upload.'),
        comments_count: z.number().describe('Number of comments on the upload.'),
        comments_url: z.string().describe('URL to fetch comments for the upload.'),
        boosts_count: z.number().describe('Number of boosts on the upload.'),
        boosts_url: z.string().describe('URL to fetch boosts for the upload.'),
        position: z.number().describe('Position of the upload in the vault.'),
        parent: z
            .object({
                id: z.number().describe('Parent vault ID.'),
                title: z.string().describe('Parent vault title.'),
                type: z.string().describe('Parent type (e.g., Vault).'),
                url: z.string().describe('API URL for the parent vault.'),
                app_url: z.string().describe('Basecamp app URL for the parent vault.')
            })
            .passthrough()
            .describe('Parent vault information.'),
        bucket: z
            .object({
                id: z.number().describe('Project ID.'),
                name: z.string().describe('Project name.'),
                type: z.string().describe('Bucket type (e.g., Project).')
            })
            .passthrough()
            .describe('Project information.'),
        creator: z
            .object({
                id: z.number().describe('Creator person ID.'),
                name: z.string().describe('Creator name.'),
                email_address: z.string().describe('Creator email address.')
            })
            .passthrough()
            .describe('Creator information.'),
        description: z.string().describe('Description of the upload in HTML.'),
        description_attachments: z.array(z.unknown()).describe('Attachments embedded in the description.'),
        content_type: z.string().describe('MIME type of the uploaded file.'),
        byte_size: z.number().describe('Size of the uploaded file in bytes.'),
        filename: z.string().describe('Filename of the uploaded file.'),
        download_url: z.string().describe('URL to download the uploaded file.'),
        app_download_url: z.string().describe('Basecamp app URL to download the uploaded file.'),
        width: z.number().optional().describe('Width of the uploaded image in pixels, if applicable.'),
        height: z.number().optional().describe('Height of the uploaded image in pixels, if applicable.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        items: z.array(UploadSchema).describe('List of file uploads in the vault.')
    })
    .describe('Output for listing uploads in a Basecamp vault.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of file uploads from a Basecamp vault.
 * @pitfalls: Only active uploads are returned; trashed and archived uploads are excluded from results.
 */
const action = createAction({
    description: 'List file uploads in a vault.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const items: z.infer<typeof UploadSchema>[] = [];

        // https://github.com/basecamp/bc3-api/blob/master/sections/uploads.md
        for await (const page of nango.paginate({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/vaults/${encodeURIComponent(input.vaultId)}/uploads.json`,
            retries: 3,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next'
            }
        })) {
            const parsedPage = z.array(UploadSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'Failed to validate upload list response',
                    details: parsedPage.error.message
                });
            }
            items.push(...parsedPage.data);
        }

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
