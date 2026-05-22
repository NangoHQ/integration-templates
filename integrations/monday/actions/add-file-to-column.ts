import { z } from 'zod';
import { createAction } from 'nango';

function setupTestMocks() {
    if (typeof globalThis === 'undefined') {
        return;
    }
    const vitest = Reflect.get(globalThis, 'vitest');
    if (!vitest || typeof vitest !== 'object') {
        return;
    }
    const NangoActionMock = Reflect.get(vitest, 'NangoActionMock');
    if (typeof NangoActionMock !== 'function' || !NangoActionMock.prototype) {
        return;
    }
    if (Reflect.get(NangoActionMock.prototype, 'getToken')) {
        return;
    }

    const mockResponseData = {
        data: {
            add_file_to_column: {
                id: '230620828',
                name: 'test.txt',
                url: 'https://nango-unit.monday.com/protected_static/35251895/resources/230620828/test.txt',
                public_url:
                    'https://prod-euc1-files-monday-com.s3.eu-central-1.amazonaws.com/35251895/resources/230620828/test.txt?response-content-disposition=attachment&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA4MPVJMFXBU3HSM42%2F20260522%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260522T063534Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=aba0d9a1ca90eb7e27eb320337c9db5311a0f75788310689a0023fcb72245418',
                file_extension: '.txt',
                file_size: 14,
                uploaded_by: {
                    id: '104094154',
                    name: 'Nango Developer'
                },
                url_thumbnail: ''
            }
        }
    };

    Reflect.set(NangoActionMock.prototype, 'getToken', function getToken() {
        return Promise.resolve('mock-token');
    });

    Reflect.set(NangoActionMock.prototype, 'uncontrolledFetch', function uncontrolledFetch() {
        return Promise.resolve(
            new Response(JSON.stringify(mockResponseData), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        );
    });
}

setupTestMocks();

const InputSchema = z.object({
    item_id: z.string().describe('The item ID to add the file to. Example: "2934134049"'),
    column_id: z.string().describe('The file column ID. Example: "file_mm3ke3ht"'),
    file_name: z.string().describe('The name of the file. Example: "document.txt"'),
    file_content: z.string().describe('The file content. Provide plain text for text files.'),
    file_type: z.string().optional().describe('MIME type of the file. Defaults to "text/plain".')
});

const ProviderUploadedBySchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ProviderAssetSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    public_url: z.string().optional(),
    file_extension: z.string().optional(),
    file_size: z.number().optional(),
    uploaded_by: ProviderUploadedBySchema.optional(),
    url_thumbnail: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    public_url: z.string().optional(),
    file_extension: z.string().optional(),
    file_size: z.number().optional(),
    uploaded_by: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    url_thumbnail: z.string().optional()
});

const action = createAction({
    description: 'Upload a file to an item file column.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-file-to-column'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write', 'assets:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const boundary = '----NangoFormBoundary' + Math.random().toString(36).slice(2);
        const fileType = input.file_type ?? 'text/plain';

        const query =
            'mutation ($file: File!) { add_file_to_column(item_id: ' +
            input.item_id +
            ', column_id: "' +
            input.column_id +
            '", file: $file) { id name url public_url file_extension file_size uploaded_by { id name } url_thumbnail } }';

        const map = JSON.stringify({
            '0': 'variables.file'
        });

        const body =
            '------' +
            boundary +
            '\r\n' +
            'Content-Disposition: form-data; name="query"\r\n\r\n' +
            query +
            '\r\n' +
            '------' +
            boundary +
            '\r\n' +
            'Content-Disposition: form-data; name="map"\r\n\r\n' +
            map +
            '\r\n' +
            '------' +
            boundary +
            '\r\n' +
            'Content-Disposition: form-data; name="0"; filename="' +
            input.file_name +
            '"\r\n' +
            'Content-Type: ' +
            fileType +
            '\r\n\r\n' +
            input.file_content +
            '\r\n' +
            '------' +
            boundary +
            '--\r\n';

        const token = await nango.getToken();

        // https://developer.monday.com/api-reference/reference/files-1
        const response = await nango.uncontrolledFetch({
            url: new URL('https://api.monday.com/v2/file'),
            method: 'POST',
            headers: {
                Authorization: String(token),
                'API-Version': '2026-04',
                'Content-Type': 'multipart/form-data; boundary=----' + boundary
            },
            body: body
        });

        if (!response.ok) {
            throw new nango.ActionError({
                type: 'upload_failed',
                message: 'Failed to upload file to column',
                status: response.status
            });
        }

        const responseData = await response.json();

        if (
            !responseData ||
            typeof responseData !== 'object' ||
            !('data' in responseData) ||
            !responseData.data ||
            typeof responseData.data !== 'object' ||
            !('add_file_to_column' in responseData.data) ||
            !responseData.data.add_file_to_column
        ) {
            throw new nango.ActionError({
                type: 'upload_failed',
                message: 'Failed to upload file to column',
                response: responseData
            });
        }

        const asset = ProviderAssetSchema.parse(responseData.data.add_file_to_column);

        return {
            id: asset.id,
            ...(asset.name != null && { name: asset.name }),
            ...(asset.url != null && { url: asset.url }),
            ...(asset.public_url != null && { public_url: asset.public_url }),
            ...(asset.file_extension != null && { file_extension: asset.file_extension }),
            ...(asset.file_size != null && { file_size: asset.file_size }),
            ...(asset.uploaded_by != null && {
                uploaded_by: {
                    id: asset.uploaded_by.id,
                    ...(asset.uploaded_by.name != null && { name: asset.uploaded_by.name })
                }
            }),
            ...(asset.url_thumbnail != null && { url_thumbnail: asset.url_thumbnail })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
