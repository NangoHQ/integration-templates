import { z } from 'zod';
import { createAction } from 'nango';

const SegmentOptionsSchema = z
    .object({
        match: z.enum(['any', 'all']).optional(),
        conditions: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "a1b2c3d4e5"'),
    segment_id: z.string().describe('The unique id for the segment. Example: "12345"'),
    name: z.string().describe('The name of the segment.'),
    options: SegmentOptionsSchema.optional(),
    static_segment: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    member_count: z.number().optional(),
    type: z.enum(['saved', 'static', 'fuzzy']).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    options: SegmentOptionsSchema.optional()
});

const action = createAction({
    description: 'Update a segment in Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-segment',
        group: 'Segments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['audiences'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://mailchimp.com/developer/marketing/api/list-segments/
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/segments/${encodeURIComponent(input.segment_id)}`,
            data: {
                name: input.name,
                ...(input.options !== undefined && { options: input.options }),
                ...(input.static_segment !== undefined && { static_segment: input.static_segment })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Segment not found',
                list_id: input.list_id,
                segment_id: input.segment_id
            });
        }

        const segment = OutputSchema.parse(response.data);
        return segment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
