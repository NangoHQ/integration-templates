import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string(),
    email_address: z.string(),
    verified: z.boolean().optional(),
    primary: z.boolean().optional(),
    notify_primary_email_address_changed: z.boolean().optional()
});
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        email_address: z.string(),
        verification: z.object({ status: z.string().optional(), strategy: z.string().optional() }).passthrough().nullable().optional(),
        linked_to: z.array(z.object({ id: z.string(), type: z.string() }).passthrough()).optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Create a Clerk email address.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://clerk.com/docs/reference/backend-api/tag/Email-Addresses#operation/CreateEmailAddress
            endpoint: '/v1/email_addresses',
            data: {
                user_id: input.user_id,
                email_address: input.email_address,
                ...(input.verified !== undefined && { verified: input.verified }),
                ...(input.primary !== undefined && { primary: input.primary }),
                ...(input.notify_primary_email_address_changed !== undefined && {
                    notify_primary_email_address_changed: input.notify_primary_email_address_changed
                })
            },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
