import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ directory_id: z.string() });
const ResourceSchema = z
    .object({
        object: z.literal('directory'),
        id: z.string(),
        domain: z.string(),
        external_key: z.string(),
        name: z.string(),
        organization_id: z.string().nullable().optional(),
        state: z.string(),
        type: z.string(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Get a WorkOS directory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workos.com/docs/reference/directory-sync/directory
            endpoint: `/directories/${encodeURIComponent(input.directory_id)}`,

            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
