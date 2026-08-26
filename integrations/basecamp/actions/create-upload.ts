import { z } from 'zod';
import { createAction } from 'nango';

const CreatorSchema = z.object({
    id: z.number().describe('Creator person ID.'),
    attachable_sgid: z.string().describe('Creator attachable SGID.'),
    name: z.string().describe('Creator display name.')
});

const ParentSchema = z.object({
    id: z.number().describe('Parent vault ID.'),
    title: z.string().describe('Parent vault title.'),
    type: z.string().describe('Parent resource type.')
});

const BucketSchema = z.object({
    id: z.number().describe('Project bucket ID.'),
    name: z.string().describe('Project name.'),
    type: z.string().describe('Bucket resource type.')
});

const UploadSchema = z
    .object({
        id: z.number().describe('Upload record ID.'),
        status: z.string().describe('Recording status, e.g. active.'),
        visible_to_clients: z.boolean().describe('Whether the upload is visible to clients.'),
        created_at: z.string().describe('ISO 8601 creation timestamp.'),
        updated_at: z.string().describe('ISO 8601 last-update timestamp.'),
        title: z.string().describe('Upload title (derived from the file name).'),
        inherits_status: z.boolean().describe('Whether the upload inherits its parent status.'),
        type: z.string().describe('Resource type, always "Upload".'),
        url: z.string().describe('API URL for this upload.'),
        app_url: z.string().describe('Basecamp web app URL for this upload.'),
        bookmark_url: z.string().describe('Bookmark API URL for this upload.'),
        subscription_url: z.string().describe('Subscription API URL for this upload.'),
        comments_count: z.number().describe('Number of comments on this upload.'),
        comments_url: z.string().describe('Comments API URL for this upload.'),
        boosts_count: z.number().describe('Number of boosts on this upload.'),
        boosts_url: z.string().describe('Boosts API URL for this upload.'),
        position: z.number().describe('Position within the parent vault.'),
        parent: ParentSchema.describe('Parent vault containing this upload.'),
        bucket: BucketSchema.describe('Project bucket containing this upload.'),
        creator: CreatorSchema.describe('Person who created this upload.'),
        description: z.string().optional().describe('HTML description of the upload.'),
        description_attachments: z.array(z.unknown()).describe('Attachments embedded in the description.'),
        content_type: z.string().describe('MIME type of the uploaded file.'),
        byte_size: z.number().describe('File size in bytes.'),
        filename: z.string().describe('Uploaded file name with extension.'),
        download_url: z.string().describe('Direct download URL for the file.'),
        app_download_url: z.string().describe('Basecamp app download URL for the file.'),
        width: z.number().optional().describe('Image width in pixels, if applicable.'),
        height: z.number().optional().describe('Image height in pixels, if applicable.')
    })
    .describe('A newly created Upload record in a Basecamp vault.');

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID (bucket) containing the vault.'),
        vaultId: z.number().describe('Vault ID under which the upload will be created.'),
        attachableSgid: z.string().describe('Attachment SGID from the upload-attachment staging step.'),
        description: z.string().optional().describe('HTML description of the upload.'),
        baseName: z.string().optional().describe('Base file name without extension (e.g., "pizza" for "pizza.png").'),
        visibleToClients: z.boolean().optional().describe('Whether the upload is visible to clients. Defaults to false.')
    })
    .describe('Input to create an Upload record from a previously-staged attachment.');

const OutputSchema = UploadSchema;

/**
 * @tags: [write]
 * @tagReason: Creates a new Upload record in a Basecamp vault by attaching a previously-staged file.
 * @pitfalls: Requires an `attachableSgid` obtained from a prior attachment-staging call; omitting `base_name` infers the upload title from the staged file's original filename.
 */
const action = createAction({
    description: 'Attach a previously-staged file (from upload-attachment) into a vault as an Upload record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            attachable_sgid: input.attachableSgid
        };

        if (input.description !== undefined) {
            body['description'] = input.description;
        }

        if (input.baseName !== undefined) {
            body['base_name'] = input.baseName;
        }

        if (input.visibleToClients !== undefined) {
            body['visible_to_clients'] = input.visibleToClients;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/uploads.md#create-an-upload
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/vaults/${encodeURIComponent(String(input.vaultId))}/uploads.json`,
            data: body,
            retries: 3
        });

        const upload = UploadSchema.parse(response.data);
        return upload;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
