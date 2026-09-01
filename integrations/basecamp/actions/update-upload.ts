import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) containing the upload.'),
        uploadId: z.number().describe('The ID of the upload to update.'),
        baseName: z.string().optional().describe('New file name without extension. Omit or send an empty string to keep the current name.'),
        description: z
            .string()
            .nullable()
            .optional()
            .describe('New description for the upload. Omit to leave unchanged, or send an empty string or null to clear it.')
    })
    .describe('Input to update the metadata of an existing Basecamp upload.');

const ProviderCreatorSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const ProviderBucketSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const ProviderParentSchema = z.object({
    id: z.number().optional(),
    title: z.string().optional(),
    type: z.string().optional()
});

const ProviderUploadSchema = z.object({
    id: z.number(),
    status: z.string().optional(),
    title: z.string().optional(),
    base_name: z.string().optional(),
    description: z.string().optional(),
    filename: z.string().optional(),
    content_type: z.string().optional(),
    byte_size: z.number().optional(),
    download_url: z.string().optional(),
    url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    type: z.string().optional(),
    bucket: ProviderBucketSchema.optional(),
    parent: ProviderParentSchema.optional(),
    creator: ProviderCreatorSchema.optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the upload.'),
        status: z.string().optional().describe('The current status of the upload, e.g., active or drafted.'),
        title: z.string().optional().describe('The display title (file name) of the upload.'),
        baseName: z.string().optional().describe('The file name without extension.'),
        description: z.string().optional().describe('The HTML description of the upload.'),
        filename: z.string().optional().describe('The full file name with extension.'),
        contentType: z.string().optional().describe('The MIME type of the uploaded file.'),
        byteSize: z.number().optional().describe('The size of the file in bytes.'),
        downloadUrl: z.string().optional().describe('Direct URL to download the latest file version.'),
        url: z.string().optional().describe('API URL for the upload resource.'),
        createdAt: z.string().optional().describe('ISO 8601 timestamp when the upload was created.'),
        updatedAt: z.string().optional().describe('ISO 8601 timestamp when the upload was last updated.'),
        projectId: z.number().optional().describe('The ID of the project (bucket) that owns the upload.'),
        vaultId: z.number().optional().describe('The ID of the vault (parent) containing the upload.'),
        creatorId: z.number().optional().describe('The ID of the user who created the upload.')
    })
    .describe('The updated Basecamp upload metadata.');

/**
 * @tags: [write]
 * @tagReason: Updates the metadata (base_name and description) of an existing Basecamp upload.
 * @pitfalls: Sending an empty string for baseName keeps the current file name rather than clearing it; updating metadata does not create a new file version.
 */
const action = createAction({
    description: 'Update a Basecamp upload metadata (base_name and description) without replacing the file content.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/uploads.md
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/uploads/${encodeURIComponent(String(input.uploadId))}.json`,
            data: {
                ...(input.baseName !== undefined && { base_name: input.baseName }),
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Upload not found or update failed.',
                projectId: input.projectId,
                uploadId: input.uploadId
            });
        }

        const upload = ProviderUploadSchema.parse(response.data);

        return {
            id: upload.id,
            ...(upload.status !== undefined && { status: upload.status }),
            ...(upload.title !== undefined && { title: upload.title }),
            ...(upload.base_name !== undefined && { baseName: upload.base_name }),
            ...(upload.description !== undefined && { description: upload.description }),
            ...(upload.filename !== undefined && { filename: upload.filename }),
            ...(upload.content_type !== undefined && { contentType: upload.content_type }),
            ...(upload.byte_size !== undefined && { byteSize: upload.byte_size }),
            ...(upload.download_url !== undefined && { downloadUrl: upload.download_url }),
            ...(upload.url !== undefined && { url: upload.url }),
            ...(upload.created_at !== undefined && { createdAt: upload.created_at }),
            ...(upload.updated_at !== undefined && { updatedAt: upload.updated_at }),
            ...(upload.bucket?.id !== undefined && { projectId: upload.bucket.id }),
            ...(upload.parent?.id !== undefined && { vaultId: upload.parent.id }),
            ...(upload.creator?.id !== undefined && { creatorId: upload.creator.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
