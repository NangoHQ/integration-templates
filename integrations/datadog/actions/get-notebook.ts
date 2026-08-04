import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    notebook_id: z.number().describe('The notebook ID. Example: 15174764')
});

const ProviderNotebookSchema = z
    .object({
        id: z.number(),
        type: z.string(),
        attributes: z.record(z.string(), z.unknown())
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    type: z.string(),
    attributes: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Get a single notebook by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/notebooks/#get-a-notebook
            endpoint: `v1/notebooks/${encodeURIComponent(String(input.notebook_id))}`,
            retries: 3
        });

        const body = response.data;
        if (!body || typeof body !== 'object' || !body.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Notebook not found',
                notebook_id: input.notebook_id
            });
        }

        const notebook = ProviderNotebookSchema.parse(body.data);

        return {
            id: notebook.id,
            type: notebook.type,
            attributes: notebook.attributes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
