import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ phone_number_id: z.string() });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Delete a Clerk phone number.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://clerk.com/docs/reference/backend-api/tag/Phone-Numbers#operation/DeletePhoneNumber
            endpoint: `/v1/phone_numbers/${encodeURIComponent(input.phone_number_id)}`,
            retries: 3
        });
        return { id: input.phone_number_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
