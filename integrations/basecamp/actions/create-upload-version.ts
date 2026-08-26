import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Basecamp project (bucket) ID. Example: 48644099'),
        uploadId: z.number().describe('Upload ID whose file content will be replaced. Example: 1069480281'),
        attachableSgid: z.string().describe('Attachment SGID from the create-attachment staging endpoint. Example: "BAh7BkkiC19yYW..."'),
        baseName: z.string().optional().describe('New file name without extension. Omit to keep the uploaded file name.'),
        description: z.string().optional().describe('HTML description of the upload. Omit to carry the previous version forward, send "" or null to clear it.'),
        notify: z
            .union([z.literal('default'), z.literal('everyone'), z.literal('custom')])
            .optional()
            .describe('Who to notify: default, everyone, or custom.'),
        subscriptions: z.array(z.number()).optional().describe('Array of person IDs to notify when notify is custom.')
    })
    .describe('Input for replacing an upload file with a new version.');

const CreatorSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional()
});

const ParentSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string()
});

const BucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string().optional()
});

const ProviderUploadSchema = z
    .object({
        id: z.number(),
        status: z.string().optional(),
        title: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        filename: z.string().optional(),
        content_type: z.string().optional(),
        byte_size: z.number().optional(),
        download_url: z.string().optional(),
        app_download_url: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        url: z.string().optional(),
        app_url: z.string().optional(),
        position: z.number().optional(),
        parent: ParentSchema.optional(),
        bucket: BucketSchema.optional(),
        creator: CreatorSchema.optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('Upload ID.'),
        status: z.string().optional().describe('Recording status: active, drafted, archived, or trashed.'),
        title: z.string().optional().describe('Upload title (file name).'),
        type: z.string().optional().describe('Recording type. Always "Upload" for uploads.'),
        description: z.string().optional().describe('HTML description of the upload.'),
        filename: z.string().optional().describe('File name of the uploaded content.'),
        contentType: z.string().optional().describe('MIME type of the file.'),
        byteSize: z.number().optional().describe('Size of the file in bytes.'),
        downloadUrl: z.string().optional().describe('URL to download the latest version of the file.'),
        appDownloadUrl: z.string().optional().describe('App-specific URL to download the latest version.'),
        width: z.number().optional().describe('Width in pixels for image files.'),
        height: z.number().optional().describe('Height in pixels for image files.'),
        createdAt: z.string().optional().describe('ISO 8601 timestamp of creation.'),
        updatedAt: z.string().optional().describe('ISO 8601 timestamp of last update.'),
        url: z.string().optional().describe('API URL for this upload.'),
        appUrl: z.string().optional().describe('App URL for this upload.'),
        position: z.number().optional().describe('Position within the parent vault.'),
        parent: z
            .object({
                id: z.number().describe('Parent vault ID.'),
                title: z.string().describe('Parent vault title.'),
                type: z.string().describe('Parent type, e.g. "Vault".')
            })
            .optional()
            .describe('Parent vault containing this upload.'),
        bucket: z
            .object({
                id: z.number().describe('Project (bucket) ID.'),
                name: z.string().describe('Project name.')
            })
            .optional()
            .describe('Project containing this upload.'),
        creator: z
            .object({
                id: z.number().describe('Creator person ID.'),
                name: z.string().describe('Creator name.'),
                emailAddress: z.string().optional().describe('Creator email address.')
            })
            .optional()
            .describe('Person who created or last updated this upload.')
    })
    .describe('Output of the replaced upload, including the new version details.');

/**
 * @tags: [write, destructive]
 * @tagReason: Replaces the file content of an existing upload, creating a new version and consuming additional storage.
 * @pitfalls: Omitting description preserves the previous version's description rather than clearing it; send empty string or null to clear. base_name must be a file name without extension. The account returns 507 Insufficient Storage when the storage limit is reached.
 */
const action = createAction({
    description: 'Replace an upload file with a new version.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            attachable_sgid: input.attachableSgid
        };

        if (input.baseName !== undefined) {
            body['base_name'] = input.baseName;
        }

        if (input.description !== undefined) {
            body['description'] = input.description;
        }

        if (input.notify !== undefined) {
            body['notify'] = input.notify;
        }

        if (input.subscriptions !== undefined) {
            body['subscriptions'] = input.subscriptions;
        }

        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/uploads.md
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/uploads/${encodeURIComponent(input.uploadId)}/versions.json`,
            data: body,
            retries: 3
        });

        const providerUpload = ProviderUploadSchema.parse(response.data);

        return {
            id: providerUpload.id,
            ...(providerUpload.status !== undefined && { status: providerUpload.status }),
            ...(providerUpload.title !== undefined && { title: providerUpload.title }),
            ...(providerUpload.type !== undefined && { type: providerUpload.type }),
            ...(providerUpload.description !== undefined && { description: providerUpload.description }),
            ...(providerUpload.filename !== undefined && { filename: providerUpload.filename }),
            ...(providerUpload.content_type !== undefined && { contentType: providerUpload.content_type }),
            ...(providerUpload.byte_size !== undefined && { byteSize: providerUpload.byte_size }),
            ...(providerUpload.download_url !== undefined && { downloadUrl: providerUpload.download_url }),
            ...(providerUpload.app_download_url !== undefined && { appDownloadUrl: providerUpload.app_download_url }),
            ...(providerUpload.width !== undefined && { width: providerUpload.width }),
            ...(providerUpload.height !== undefined && { height: providerUpload.height }),
            ...(providerUpload.created_at !== undefined && { createdAt: providerUpload.created_at }),
            ...(providerUpload.updated_at !== undefined && { updatedAt: providerUpload.updated_at }),
            ...(providerUpload.url !== undefined && { url: providerUpload.url }),
            ...(providerUpload.app_url !== undefined && { appUrl: providerUpload.app_url }),
            ...(providerUpload.position !== undefined && { position: providerUpload.position }),
            ...(providerUpload.parent !== undefined && {
                parent: {
                    id: providerUpload.parent.id,
                    title: providerUpload.parent.title,
                    type: providerUpload.parent.type
                }
            }),
            ...(providerUpload.bucket !== undefined && {
                bucket: {
                    id: providerUpload.bucket.id,
                    name: providerUpload.bucket.name
                }
            }),
            ...(providerUpload.creator !== undefined && {
                creator: {
                    id: providerUpload.creator.id,
                    name: providerUpload.creator.name,
                    ...(providerUpload.creator.email_address != null && { emailAddress: providerUpload.creator.email_address })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
