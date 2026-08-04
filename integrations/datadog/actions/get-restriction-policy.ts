import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    resource_id: z.string().trim().min(1).describe('Resource identifier formatted as {resource_type}:{resource_uuid}. Example: "dashboard:ste-gtd-5rx"')
});

const RestrictionPolicyBindingSchema = z.object({
    principals: z.array(z.string()),
    relation: z.string()
});

const RestrictionPolicyAttributesSchema = z.object({
    bindings: z.array(RestrictionPolicyBindingSchema)
});

const RestrictionPolicyDataSchema = z.object({
    attributes: RestrictionPolicyAttributesSchema,
    id: z.string(),
    type: z.string()
});

const OutputSchema = z.object({
    data: RestrictionPolicyDataSchema
});

const action = createAction({
    description: 'Get the restriction policy (fine-grained access bindings) for a specific resource.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/restriction-policies/#get-a-restriction-policy
            endpoint: `v2/restriction_policy/${encodeURIComponent(input.resource_id)}`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
