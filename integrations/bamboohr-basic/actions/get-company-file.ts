import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    fileId: z.number().describe('Company file ID. Example: 172')
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    originalFileName: z.string().optional(),
    size: z.string().optional(),
    contentType: z.string().optional(),
    content: z.string().optional()
});

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

function extractBufferBytes(value: unknown): Uint8Array | undefined {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }
    if (!('type' in value) || value.type !== 'Buffer') {
        return undefined;
    }
    if (!('data' in value) || !Array.isArray(value.data)) {
        return undefined;
    }
    const arr = value.data;
    const numbers = arr.filter((item): item is number => typeof item === 'number');
    if (numbers.length !== arr.length) {
        return undefined;
    }
    return new Uint8Array(numbers);
}

const action = createAction({
    description: 'Retrieve a single company file from BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['company_file'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.bamboohr.com/reference/get-company-file
            endpoint: `/v1/files/${encodeURIComponent(String(input.fileId))}`,
            retries: 3,
            responseType: 'arraybuffer'
        };
        const response = await nango.get(config);

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Company file not found',
                fileId: input.fileId
            });
        }

        if (response.status === 403) {
            throw new nango.ActionError({
                type: 'permission_denied',
                message: 'You do not have permission to access this file',
                fileId: input.fileId
            });
        }

        const contentType = typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : undefined;
        const contentDisposition = typeof response.headers['content-disposition'] === 'string' ? response.headers['content-disposition'] : '';
        const contentLength = typeof response.headers['content-length'] === 'string' ? response.headers['content-length'] : undefined;

        let name: string | undefined;
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
            name = match[1];
        }

        let content: string | undefined;
        if (response.data instanceof ArrayBuffer) {
            content = arrayBufferToBase64(response.data);
        } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(response.data)) {
            content = response.data.toString('base64');
        } else {
            const bytes = extractBufferBytes(response.data);
            if (bytes !== undefined) {
                content = arrayBufferToBase64(bytes.buffer);
            }
        }

        return {
            id: input.fileId,
            ...(name !== undefined && { name, originalFileName: name }),
            ...(contentLength !== undefined && { size: contentLength }),
            contentType,
            ...(content !== undefined && { content })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
