import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    notebook_id: z.union([z.number(), z.string().trim().min(1)]).describe('The ID of the notebook to delete. Example: 15174764')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the notebook was successfully deleted.')
});

const action = createAction({
    description: 'Delete a notebook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://docs.datadoghq.com/api/latest/notebooks/#delete-a-notebook
            endpoint: `v1/notebooks/${encodeURIComponent(String(input.notebook_id))}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
