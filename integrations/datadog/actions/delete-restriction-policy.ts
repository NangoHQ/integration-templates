import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    resource_id: z.string().trim().min(1).describe('The identifier for the resource, in the format resource_type:resource_id. Example: "dashboard:abc-def-ghi"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    resource_id: z.string()
});

const action = createAction({
    description: 'Remove the restriction policy from a resource (reverting to default account-wide access rules).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/restriction-policies/#delete-a-restriction-policy
        await nango.delete({
            endpoint: `v2/restriction_policy/${encodeURIComponent(input.resource_id)}`,
            retries: 3
        });

        return {
            success: true,
            resource_id: input.resource_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
