import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ phone_number_id: z.string() });
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        phone_number: z.string(),
        reserved_for_second_factor: z.boolean().optional(),
        verification: z.object({ status: z.string().optional(), strategy: z.string().optional() }).passthrough().nullable().optional(),
        linked_to: z.array(z.object({ id: z.string(), type: z.string() }).passthrough()).optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Get a Clerk phone number.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://clerk.com/docs/reference/backend-api/tag/Phone-Numbers#operation/GetPhoneNumber
            endpoint: `/v1/phone_numbers/${encodeURIComponent(input.phone_number_id)}`,
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
