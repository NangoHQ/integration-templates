import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Rock ID. Example: "6a6175355346be5d56149d93"')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Soft-delete a rock.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/rocks/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            id: input.id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
