import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentation_id: z
        .string()
        .describe('The id of a document from the knowledge base. This is returned on document addition. Example: "21m00Tcm4TlvDq8ikWAM"'),
    force: z.boolean().optional().describe('If set to true, the document or folder will be deleted regardless of whether it is used by any agents.')
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Delete a knowledge base document.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://elevenlabs.io/docs/api-reference/knowledge-base/delete
            endpoint: `/v1/convai/knowledge-base/${encodeURIComponent(input.documentation_id)}`,
            params: {
                ...(input.force !== undefined && { force: String(input.force) })
            },
            retries: 3
        });

        const data = response.data;
        if (data === '' || data === null || data === undefined || typeof data !== 'object') {
            return {};
        }

        return OutputSchema.parse(data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
