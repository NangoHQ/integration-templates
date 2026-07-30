import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID. Example: "6a6b328004308879e7d439b6"')
});

const DocumentSchema = z
    .object({
        download: z.string().optional(),
        version: z.string().optional(),
        versionNumber: z.number().optional(),
        key: z.string().optional(),
        filename: z.string().optional(),
        lastModified: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.record(z.string(), z.array(DocumentSchema));

const action = createAction({
    description: 'List documents attached to a workflow (draft, signature packet, signed copy, etc.).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/documents`,
            retries: 3
        });

        const parsed = z.record(z.string(), z.unknown()).parse(response.data);
        const result: Record<string, Array<z.infer<typeof DocumentSchema>>> = {};

        for (const [key, value] of Object.entries(parsed)) {
            if (Array.isArray(value)) {
                const documents = value.filter((item) => typeof item === 'object' && item !== null).map((item) => DocumentSchema.parse(item));
                result[key] = documents;
            }
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
