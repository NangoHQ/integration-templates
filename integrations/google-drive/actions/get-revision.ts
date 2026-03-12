import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file. Example: "1abc123xyz"'),
    revision_id: z.string().describe('The ID of the revision. Example: "1"')
});

const OutputSchema = z.object({
    kind: z.string().describe('The type of resource. Always "drive#revision".'),
    id: z.string().describe('The ID of the revision.'),
    mimeType: z.string().describe('The MIME type of the revision.'),
    modifiedTime: z.string().describe('The last time the revision was modified in RFC 3339 format.'),
    keepForever: z.boolean().optional().describe('Whether this revision is marked as keep forever.'),
    published: z.boolean().optional().describe('Whether this revision is published.'),
    publishedLink: z.string().optional().describe('A link to the published revision.'),
    publishedOutsideDomain: z.boolean().optional().describe('Whether this revision is published outside the domain.'),
    size: z.string().optional().describe('The size of the revision in bytes.'),
    originalFilename: z.string().optional().describe('The original filename of the revision.'),
    md5Checksum: z.string().optional().describe('The MD5 checksum of the revision.')
});

const action = createAction({
    description: 'Get a file revision by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-revision',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/revisions/get
        const response = await nango.get({
            endpoint: `/drive/v3/files/${input.file_id}/revisions/${input.revision_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Revision not found',
                file_id: input.file_id,
                revision_id: input.revision_id
            });
        }

        return {
            kind: response.data.kind,
            id: response.data.id,
            mimeType: response.data.mimeType,
            modifiedTime: response.data.modifiedTime,
            keepForever: response.data.keepForever,
            published: response.data.published,
            publishedLink: response.data.publishedLink,
            publishedOutsideDomain: response.data.publishedOutsideDomain,
            size: response.data.size,
            originalFilename: response.data.originalFilename,
            md5Checksum: response.data.md5Checksum
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
