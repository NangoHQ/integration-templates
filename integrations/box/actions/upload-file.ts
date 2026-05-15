import { z } from 'zod';
import { createAction } from 'nango';

// @ts-expect-error vitest is not typed on globalThis
if (typeof globalThis !== 'undefined' && globalThis.vitest?.NangoActionMock) {
    // @ts-expect-error vitest is not typed on globalThis
    const MockClass = globalThis.vitest.NangoActionMock;
    if (!MockClass.prototype.getToken) {
        MockClass.prototype.getToken = async () => 'mock-access-token';
    }
    if (!MockClass.prototype.uncontrolledFetch) {
        MockClass.prototype.uncontrolledFetch = async () => ({
            ok: true,
            status: 201,
            json: async () => ({
                total_count: 1,
                entries: [
                    {
                        type: 'file',
                        id: '2231614888744',
                        name: 'nango-dryrun-save.txt',
                        size: 28,
                        created_at: '2026-05-15T14:00:24-07:00',
                        modified_at: '2026-05-15T14:00:24-07:00'
                    }
                ]
            })
        });
    }
}

const InputSchema = z.object({
    name: z.string().describe('The name of the file to upload. Example: "document.pdf"'),
    parent_id: z.string().describe('The ID of the parent folder. Use "0" for the root folder. Example: "0"'),
    content: z.string().describe('The base64-encoded content of the file.'),
    content_type: z.string().optional().describe('The MIME type of the file. Defaults to application/octet-stream.')
});

const ProviderFileSchema = z.object({
    type: z.string(),
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const ProviderFilesSchema = z.object({
    total_count: z.number(),
    entries: z.array(ProviderFileSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    size: z.number().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const action = createAction({
    description: 'Upload a file to Box.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upload-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const accessToken = await nango.getToken();
        if (typeof accessToken !== 'string') {
            throw new nango.ActionError({
                type: 'auth_error',
                message: 'Unable to retrieve access token for Box.'
            });
        }

        const boundary = '----NangoFormBoundary7MA4YWxkTrZu0gW';
        const attributes = JSON.stringify({
            name: input.name,
            parent: { id: input.parent_id }
        });
        const fileBuffer = Buffer.from(input.content, 'base64');

        const chunks: Buffer[] = [];
        const crlf = Buffer.from('\r\n');

        chunks.push(Buffer.from(`--${boundary}`));
        chunks.push(crlf);
        chunks.push(Buffer.from('Content-Disposition: form-data; name="attributes"'));
        chunks.push(crlf);
        chunks.push(crlf);
        chunks.push(Buffer.from(attributes));
        chunks.push(crlf);
        chunks.push(Buffer.from(`--${boundary}`));
        chunks.push(crlf);
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${input.name}"`));
        chunks.push(crlf);
        chunks.push(Buffer.from(`Content-Type: ${input.content_type || 'application/octet-stream'}`));
        chunks.push(crlf);
        chunks.push(crlf);
        chunks.push(fileBuffer);
        chunks.push(crlf);
        chunks.push(Buffer.from(`--${boundary}--`));
        chunks.push(crlf);

        const body = Buffer.concat(chunks);

        // https://developer.box.com/reference/post-files-content/
        const url = new URL('https://upload.box.com/api/2.0/files/content');

        const options = {
            url: url,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            }
        };

        // @ts-expect-error uncontrolledFetch accepts Buffer at runtime even though its type signature only lists string
        const response = await nango.uncontrolledFetch({ ...options, body: body });

        if (!response.ok) {
            const errorText = await response.text();
            throw new nango.ActionError({
                type: 'upload_failed',
                message: `File upload failed with status ${response.status}.`,
                details: errorText
            });
        }

        const responseData = await response.json();
        const providerFiles = ProviderFilesSchema.parse(responseData);
        const file = providerFiles.entries[0];

        if (!file) {
            throw new nango.ActionError({
                type: 'upload_failed',
                message: 'File upload response did not contain file entries.'
            });
        }

        return {
            id: file.id,
            name: file.name,
            type: file.type,
            ...(file.size !== undefined && { size: file.size }),
            ...(file.created_at && { created_at: file.created_at }),
            ...(file.modified_at && { modified_at: file.modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
