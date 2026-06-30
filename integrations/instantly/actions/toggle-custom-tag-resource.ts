import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tag_id: z.string().describe('Custom tag UUID. Example: "bca10b65-b620-44b3-8571-8ce409ad38c8"'),
    resource_id: z.string().describe('Resource UUID (account or campaign). Example: "ec8dae2c-8bd3-461d-90db-a8d262719b5f"'),
    resource_type: z.number().int().min(1).max(2).describe('Resource type: 1 = Account, 2 = Campaign')
});

const CustomTagMappingSchema = z.object({
    id: z.string(),
    tag_id: z.string(),
    resource_id: z.string(),
    resource_type: z.number(),
    timestamp_created: z.string(),
    organization_id: z.string()
});

const ListCustomTagMappingResponseSchema = z.object({
    items: z.array(CustomTagMappingSchema),
    next_starting_after: z.string().optional()
});

const ToggleResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean(),
    assigned: z.boolean()
});

const action = createAction({
    description: 'Assign or unassign a tag to/from a resource. Toggles assignment: assigns if not present, removes if already assigned.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['custom_tags:update', 'custom_tags:all', 'all:update', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/customtagmapping/list-custom-tag-mapping
        const mappingsResponse = await nango.get({
            endpoint: '/v2/custom-tag-mappings',
            params: {
                resource_ids: input.resource_id
            },
            retries: 3
        });

        const mappingsData = ListCustomTagMappingResponseSchema.parse(mappingsResponse.data);
        const isAssigned = mappingsData.items.some((mapping) => mapping.tag_id === input.tag_id && mapping.resource_type === input.resource_type);

        const assign = !isAssigned;

        // https://developer.instantly.ai/api-reference/customtag/assign-or-unassign-tags-to-resources
        const toggleResponse = await nango.post({
            endpoint: '/v2/custom-tags/toggle-resource',
            data: {
                tag_ids: [input.tag_id],
                resource_type: input.resource_type,
                resource_ids: [input.resource_id],
                assign
            },
            retries: 3
        });

        const toggleData = ToggleResponseSchema.parse(toggleResponse.data);

        return {
            success: toggleData.success,
            assigned: assign
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
