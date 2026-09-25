import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ group_id: z.string() });
const ResourceSchema = z
    .object({
        id: z.string(),
        idp_id: z.string(),
        directory_id: z.string(),
        organization_id: z.string().nullable(),
        name: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        raw_attributes: z.record(z.string(), z.unknown())
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Get a WorkOS directory group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workos.com/docs/reference/directory-sync/group
            endpoint: `/directory_groups/${encodeURIComponent(input.group_id)}`,

            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
