import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_domain_id: z.string() });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Delete a WorkOS organization domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://workos.com/docs/reference/organization-domain
            endpoint: `/organization_domains/${encodeURIComponent(input.organization_domain_id)}`,
            retries: 3
        });
        return { id: input.organization_domain_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
