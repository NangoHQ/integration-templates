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
        const fileBuffer = Buffer.from(input.file_content, 'base64');
        // Use Buffer to encode title as UTF-8 before base64 so non-ASCII characters
        // are correctly represented (charCodeAt returns Unicode code points, not UTF-8 bytes).
        const titleBase64 = Buffer.from(input.title, 'utf8').toString('base64');

        const importMetadata: Record<string, string> = {
            title_base64: titleBase64
        };
        if (input.mime_type) {
            importMetadata['mime_type'] = input.mime_type;
        }

        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/design-imports/create-design-import-job/
            endpoint: '/rest/v1/imports',
            data: fileBuffer,
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
