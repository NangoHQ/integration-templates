import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Segment name. Example: "New Subscribers"'),
    definition: z
        .record(z.string(), z.unknown())
        .describe(
            'Segment condition definition. Example: { condition_groups: [{ conditions: [{ type: "profile-property", property: "email", filter: { type: "existence", operator: "is-set" } }] }] }'
        )
});

const ProviderAttributesSchema = z
    .object({
        name: z.string(),
        created: z.string().optional(),
        updated: z.string().optional()
    })
    .passthrough();

const ProviderSegmentSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: ProviderAttributesSchema,
        relationships: z.record(z.string(), z.unknown()).optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const action = createAction({
    description: 'Create a segment from a condition definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/create_segment
            endpoint: '/api/segments',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'segment',
                    attributes: {
                        name: input.name,
                        definition: input.definition
                    }
                }
            },
            retries: 3
        });

        const segment = ProviderSegmentSchema.parse(response.data);
        const attributes = segment.data.attributes;

        return {
            id: segment.data.id,
            name: attributes.name,
            ...(attributes.created !== undefined && { created: attributes.created }),
            ...(attributes.updated !== undefined && { updated: attributes.updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
