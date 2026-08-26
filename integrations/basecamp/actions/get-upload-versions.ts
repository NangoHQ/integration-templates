import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) that contains the upload.'),
        uploadId: z.number().describe('The ID of the upload whose version history should be retrieved.')
    })
    .describe('Input for retrieving the version history of an upload.');

const ProviderVersionSchema = z.object({
    id: z.number(),
    recording_id: z.number(),
    action: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string(),
    creator: z
        .object({
            id: z.number(),
            name: z.string(),
            email_address: z.string().nullable()
        })
        .passthrough(),
    // The whole `upload` object is omitted (not null) on a version whose file has since been removed
    // from the account; the version event itself is still listed.
    // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/uploads.md#get-upload-versions
    upload: z
        .object({
            content_type: z.string(),
            byte_size: z.number(),
            filename: z.string(),
            download_url: z.string(),
            app_download_url: z.string().optional(),
            current: z.boolean()
        })
        .optional()
});

const ProviderVersionsSchema = z.array(ProviderVersionSchema);

const CreatorSchema = z
    .object({
        id: z.number().describe('The unique ID of the creator.'),
        name: z.string().describe('The name of the creator.'),
        email_address: z.string().nullable().describe('The email address of the creator, or null if the creator has none.')
    })
    .passthrough()
    .describe('The user who created this version.');

const VersionSchema = z.object({
    id: z.number().describe('The unique ID of this version entry.'),
    recording_id: z.number().describe('The ID of the upload this version belongs to.'),
    action: z.string().describe('The action that created this version, e.g. "created" or "updated".'),
    created_at: z.string().describe('The ISO 8601 timestamp when this version was created.'),
    creator: CreatorSchema,
    content_type: z.string().optional().describe('The MIME type of the file for this version. Absent if the file has since been removed from the account.'),
    byte_size: z.number().optional().describe('The size of the file in bytes for this version. Absent if the file has since been removed from the account.'),
    filename: z.string().optional().describe('The filename of this version. Absent if the file has since been removed from the account.'),
    download_url: z
        .string()
        .optional()
        .describe('The signed URL to download this version of the file. Absent if the file has since been removed from the account.'),
    current: z
        .boolean()
        .optional()
        .describe('Whether this is the current active version of the upload. Absent if the file has since been removed from the account.')
});

const OutputSchema = z
    .object({
        versions: z.array(VersionSchema).describe('The version history of the upload, in reverse chronological order.')
    })
    .describe('Output containing the version history of an upload.');

/**
 * @tags: [read]
 * @tagReason: Lists the version history of an upload by reading from the Basecamp API.
 * @pitfalls: The download_url is a signed, temporary URL that expires; the content_type may not reflect the actual file format if the upload was created without an explicit Content-Type header.
 */
const action = createAction({
    description: "List the version history of an upload's file content.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/uploads.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/uploads/${encodeURIComponent(input.uploadId)}/versions.json`,
            retries: 3
        });

        const providerVersions = ProviderVersionsSchema.parse(response.data);

        return {
            versions: providerVersions.map((version) => ({
                id: version.id,
                recording_id: version.recording_id,
                action: version.action,
                created_at: version.created_at,
                creator: version.creator,
                ...(version.upload && {
                    content_type: version.upload.content_type,
                    byte_size: version.upload.byte_size,
                    filename: version.upload.filename,
                    download_url: version.upload.download_url,
                    current: version.upload.current
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
