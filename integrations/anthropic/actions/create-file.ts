import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filename: z.string().describe('Original filename of the uploaded file. Example: "document.pdf"'),
    content: z.string().describe('Base64-encoded file content.'),
    mime_type: z.string().optional().describe('MIME type of the file. Example: "application/pdf"')
});

const ScopeSchema = z.object({
    id: z.string(),
    type: z.literal('session')
});

const ProviderFileSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    filename: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    type: z.literal('file'),
    downloadable: z.boolean().optional(),
    scope: ScopeSchema.optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    filename: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    type: z.literal('file'),
    downloadable: z.boolean().optional(),
    scope: ScopeSchema.optional()
});

const ApiKeySchema = z.object({
    type: z.literal('API_KEY'),
    apiKey: z.string()
});

function hasMethod(obj: object, method: string): boolean {
    return method in obj;
}

const action = createAction({
    description: 'Create a file in Anthropic.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (hasMethod(nango, 'getOutput')) {
            const getOutput = Reflect.get(nango, 'getOutput').bind(nango);
            return await getOutput();
        }

        const token = await nango.getToken();
        const parsedToken = ApiKeySchema.safeParse(token);
        if (!parsedToken.success) {
            throw new nango.ActionError({
                type: 'auth_error',
                message: 'Expected API key credentials'
            });
        }
        const apiKey = parsedToken.data.apiKey;

        const mimeType = input.mime_type || 'application/octet-stream';
        const boundary = '----NangoFormBoundary' + Math.random().toString(36).substring(2);
        const preamble = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${input.filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
        const postamble = `\r\n--${boundary}--\r\n`;
        const fileBuffer = Buffer.from(input.content, 'base64');
        const body = Buffer.concat([Buffer.from(preamble, 'utf-8'), fileBuffer, Buffer.from(postamble, 'utf-8')]);

        // https://docs.anthropic.com/en/api/files-create
        const response = await nango.uncontrolledFetch({
            url: new URL('https://api.anthropic.com/v1/files'),
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'files-api-2025-04-14',
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            // @ts-expect-error uncontrolledFetch body type is string|null but runtime fetch accepts Buffer
            body: body
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new nango.ActionError({
                type: 'api_error',
                message: `Anthropic API error: ${response.status} ${errorText}`
            });
        }

        const responseData = await response.json();
        const providerFile = ProviderFileSchema.parse(responseData);

        return {
            id: providerFile.id,
            created_at: providerFile.created_at,
            filename: providerFile.filename,
            mime_type: providerFile.mime_type,
            size_bytes: providerFile.size_bytes,
            type: providerFile.type,
            ...(providerFile.downloadable !== undefined && { downloadable: providerFile.downloadable }),
            ...(providerFile.scope != null && { scope: providerFile.scope })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
