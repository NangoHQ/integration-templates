import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string(),
    phone_number: z.string(),
    verified: z.boolean().optional(),
    primary: z.boolean().optional(),
    reserved_for_second_factor: z.boolean().optional()
});
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
    description: 'Create a Clerk phone number.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://clerk.com/docs/reference/backend-api/tag/Phone-Numbers#operation/CreatePhoneNumber
            endpoint: '/v1/phone_numbers',
            data: {
                user_id: input.user_id,
                phone_number: input.phone_number,
                ...(input.verified !== undefined && { verified: input.verified }),
                ...(input.primary !== undefined && { primary: input.primary }),
                ...(input.reserved_for_second_factor !== undefined && { reserved_for_second_factor: input.reserved_for_second_factor })
            },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
