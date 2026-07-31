import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID. Example: "6a6b328004308879e7d439b6"'),
    documentKey: z.string().describe('Document key from list-workflow-documents. Example: "F7IYVm-59VHKoqCLLuiFd"')
});

const OutputSchema = z.object({
    content: z.string().describe('Base64-encoded document content'),
    contentType: z.string().optional().describe('MIME type of the document'),
    filename: z.string().optional().describe('Filename of the document')
});

const action = createAction({
    description: 'Download the binary content of a specific workflow document.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readDocuments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/download-workflow-document
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/document/${encodeURIComponent(input.documentKey)}/download`,
            responseType: 'arraybuffer',
            retries: 3
        });

        const rawHeaders = response.headers;

        const contentType =
            typeof rawHeaders['content-type'] === 'string'
                ? rawHeaders['content-type']
                : Array.isArray(rawHeaders['content-type']) && rawHeaders['content-type'].length > 0
                  ? rawHeaders['content-type'][0]
                  : undefined;

        const contentDisposition =
            typeof rawHeaders['content-disposition'] === 'string'
                ? rawHeaders['content-disposition']
                : Array.isArray(rawHeaders['content-disposition']) && rawHeaders['content-disposition'].length > 0
                  ? rawHeaders['content-disposition'][0]
                  : undefined;

        let filename: string | undefined;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match) {
                filename = match[1];
            }
        }

        const buffer = Buffer.from(response.data);
        const base64Content = buffer.toString('base64');

        return {
            content: base64Content,
            ...(contentType && { contentType }),
            ...(filename && { filename })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
