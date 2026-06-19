import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Contact ID to delete. Example: "cont_abc123"')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a contact',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.close.com/
            endpoint: `/v1/contact/${encodeURIComponent(input.id)}/`,
            retries: 1
        });

        return {
            id: input.id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
