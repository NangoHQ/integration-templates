import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('The title of the design to create. Maximum 50 characters. Example: "My Imported Design"'),
    file_content: z.string().describe('Base64-encoded file content. Supported formats: PPTX, PDF, SVG. Example: "PHN2Zy4u."'),
    mime_type: z
        .string()
        .optional()
        .describe('The MIME type of the file being imported. If not provided, Canva attempts to automatically detect the type. Example: "application/pdf"')
});

const OutputSchema = z.object({
    job: z.object({
        id: z.string(),
        status: z.string()
    })
});

const action = createAction({
    description: 'Start a binary design import job',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['portability:import'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const lookup: Record<string, number> = {};
        for (let i = 0; i < base64Chars.length; i++) {
            const ch = base64Chars[i];
            if (ch !== undefined) {
                lookup[ch] = i;
            }
        }

        const cleanBase64 = input.file_content.replace(/=+$/, '').replace(/\s/g, '');
        const len = cleanBase64.length;
        const bufferLength = Math.floor(len * 0.75);
        const arraybuffer = new ArrayBuffer(bufferLength);
        const bytes = new Uint8Array(arraybuffer);

        let p = 0;
        for (let i = 0; i < len; i += 4) {
            const c1 = cleanBase64[i];
            const c2 = cleanBase64[i + 1];
            const c3 = cleanBase64[i + 2];
            const c4 = cleanBase64[i + 3];
            const encoded1 = c1 !== undefined ? (lookup[c1] ?? 0) : 0;
            const encoded2 = c2 !== undefined ? (lookup[c2] ?? 0) : 0;
            const encoded3 = c3 !== undefined ? (lookup[c3] ?? 0) : 0;
            const encoded4 = c4 !== undefined ? (lookup[c4] ?? 0) : 0;

            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            if (c3 !== undefined) {
                bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            }
            if (c4 !== undefined) {
                bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
            }
        }

        let titleBase64 = '';
        const titleBytes = new Uint8Array(input.title.length);
        for (let i = 0; i < input.title.length; i++) {
            const code = input.title.charCodeAt(i);
            titleBytes[i] = code;
        }
        const titleLen = titleBytes.length;
        for (let i = 0; i < titleLen; i += 3) {
            const b1 = titleBytes[i];
            if (b1 === undefined) {
                break;
            }
            const b2 = titleBytes[i + 1];
            const b3 = titleBytes[i + 2];
            titleBase64 += base64Chars[b1 >> 2];
            titleBase64 += base64Chars[((b1 & 3) << 4) | (b2 !== undefined ? b2 >> 4 : 0)];
            if (b2 !== undefined) {
                titleBase64 += base64Chars[((b2 & 15) << 2) | (b3 !== undefined ? b3 >> 6 : 0)];
            } else {
                titleBase64 += '=';
            }
            if (b3 !== undefined) {
                titleBase64 += base64Chars[b3 & 63];
            } else if (b2 !== undefined) {
                titleBase64 += '=';
            }
        }

        const importMetadata: Record<string, string> = {
            title_base64: titleBase64
        };
        if (input.mime_type) {
            importMetadata['mime_type'] = input.mime_type;
        }

        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/design-imports/create-design-import-job/
            endpoint: '/rest/v1/imports',
            data: bytes.buffer,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Import-Metadata': JSON.stringify(importMetadata)
            },
            retries: 3
        });

        const responseSchema = z.object({
            job: z.object({
                id: z.string(),
                status: z.string()
            })
        });

        const parsed = responseSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
