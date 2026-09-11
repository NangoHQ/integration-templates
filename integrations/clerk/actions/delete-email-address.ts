import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ email_address_id: z.string() });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Delete a Clerk email address.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://clerk.com/docs/reference/backend-api/tag/Email-Addresses#operation/DeleteEmailAddress
            endpoint: `/v1/email_addresses/${encodeURIComponent(input.email_address_id)}`,
            retries: 3
        });
        return { id: input.email_address_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
