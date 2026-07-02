import { z } from 'zod';
import { createAction } from 'nango';

const SegmentDefinitionSchema = z.object({
    condition_groups: z.array(z.record(z.string(), z.unknown())).optional()
});

const InputSchema = z.object({
    id: z.string().describe('Segment ID. Example: "SRSEt8"'),
    name: z.string().nullable().optional().describe('The name of the segment.'),
    definition: SegmentDefinitionSchema.nullable().optional().describe('The segment definition containing condition groups.'),
    is_starred: z.boolean().nullable().optional().describe('Whether the segment is starred.'),
    is_active: z.boolean().nullable().optional().describe('Set to false to deactivate the segment. Must be the only attribute when deactivating.')
});

const ProviderSegmentAttributesSchema = z.object({
    name: z.string().nullable().optional(),
    definition: SegmentDefinitionSchema.nullable().optional(),
    created: z.string().nullable().optional(),
    updated: z.string().nullable().optional(),
    is_active: z.boolean(),
    is_processing: z.boolean(),
    is_starred: z.boolean()
});

const ProviderSegmentSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderSegmentAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderSegmentSchema
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    definition: SegmentDefinitionSchema.optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    is_active: z.boolean(),
    is_processing: z.boolean(),
    is_starred: z.boolean()
});

const action = createAction({
    description: "Update a segment's name or definition.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['segments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            data: {
                type: 'segment',
                id: input.id,
                attributes: {
                    ...(input.name !== undefined && { name: input.name }),
                    ...(input.definition !== undefined && { definition: input.definition }),
                    ...(input.is_starred !== undefined && { is_starred: input.is_starred }),
                    ...(input.is_active !== undefined && { is_active: input.is_active })
                }
            }
        };

        const response = await nango.patch({
            // https://developers.klaviyo.com/en/reference/update_segment
            endpoint: `/api/segments/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const attributes = providerResponse.data.attributes;

        return {
            id: providerResponse.data.id,
            type: providerResponse.data.type,
            ...(attributes.name != null && { name: attributes.name }),
            ...(attributes.definition != null && { definition: attributes.definition }),
            ...(attributes.created != null && { created: attributes.created }),
            ...(attributes.updated != null && { updated: attributes.updated }),
            is_active: attributes.is_active,
            is_processing: attributes.is_processing,
            is_starred: attributes.is_starred
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
