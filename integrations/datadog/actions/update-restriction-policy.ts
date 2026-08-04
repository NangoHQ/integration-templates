import { z } from 'zod';
import { createAction } from 'nango';

const BindingSchema = z.object({
    relation: z.string().describe('Relationship between the principal and the resource. Example: "editor"'),
    principals: z
        .array(z.string())
        .describe('List of principals in the form role:{roleId}, user:{userId}, or org:{orgId}. Example: ["role:00000000-0000-0000-0000-000000000000"]')
});

const InputSchema = z.object({
    resource_id: z.string().describe('The identifier of the resource to restrict. Example: "abc-def-ghi"'),
    bindings: z.array(BindingSchema).min(1).describe('At least one binding is required. An empty array is rejected by the API.')
});

const ProviderRestrictionPolicySchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({
        bindings: z.array(BindingSchema)
    })
});

const ProviderResponseSchema = z.object({
    data: ProviderRestrictionPolicySchema
});

const OutputSchema = z.object({
    resource_id: z.string(),
    type: z.string(),
    bindings: z.array(BindingSchema)
});

const action = createAction({
    description: 'Set or replace the restriction policy (access bindings) for a resource.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/restriction-policies/#update-a-restriction-policy
            endpoint: `v2/restriction_policy/${encodeURIComponent(input.resource_id)}`,
            data: {
                data: {
                    id: input.resource_id,
                    type: 'restriction_policy',
                    attributes: {
                        bindings: input.bindings
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            resource_id: parsed.data.id,
            type: parsed.data.type,
            bindings: parsed.data.attributes.bindings
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
