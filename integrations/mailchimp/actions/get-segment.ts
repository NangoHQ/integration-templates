import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "a1b2c3d4e5"'),
    segment_id: z.number().int().describe('The unique ID for the segment. Example: 12345')
});

const LinkSchema = z.object({
    rel: z.string().optional(),
    href: z.string().optional(),
    method: z.string().optional(),
    targetSchema: z.string().optional(),
    schema: z.string().optional()
});

const OptionsSchema = z
    .object({
        match: z.string().optional(),
        conditions: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .optional();

const ProviderSegmentSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    member_count: z.number().int(),
    type: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    options: OptionsSchema,
    list_id: z.string(),
    _links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    member_count: z.number().int(),
    type: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    options: OptionsSchema,
    list_id: z.string(),
    _links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Retrieve a single segment from Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['audiences'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://mailchimp.com/developer/marketing/api/list-segments/get-segment-info/
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/segments/${encodeURIComponent(String(input.segment_id))}`,
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

        const segment = ProviderSegmentSchema.parse(response.data);

        return {
            id: segment.id,
            name: segment.name,
            member_count: segment.member_count,
            type: segment.type,
            created_at: segment.created_at,
            updated_at: segment.updated_at,
            options: segment.options,
            list_id: segment.list_id,
            ...(segment._links !== undefined && { _links: segment._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
