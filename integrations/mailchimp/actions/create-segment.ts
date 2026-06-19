import { z } from 'zod';
import { createAction } from 'nango';

const ConditionSchema = z.object({
    condition_type: z.string().optional(),
    field: z.string().optional(),
    op: z.string().optional(),
    value: z.unknown().optional()
});

const OptionsSchema = z.object({
    match: z.enum(['any', 'all']).optional(),
    conditions: z.array(ConditionSchema).optional()
});

const InputSchema = z
    .object({
        list_id: z.string().describe('The unique ID for the list. Example: "16ed227135"'),
        name: z.string().describe('The name of the segment. Example: "VIP Customers"'),
        static_segment: z
            .array(z.string())
            .optional()
            .describe('An array of emails to be used for a static segment. Cannot be provided with the options field.'),
        options: OptionsSchema.optional().describe('The conditions of the segment. Static and fuzzy segments do not have conditions.')
    })
    .refine((data) => !(data.static_segment !== undefined && data.options !== undefined), {
        message: 'static_segment and options cannot both be provided'
    });

const ProviderSegmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    member_count: z.number(),
    type: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    list_id: z.string().optional(),
    options: OptionsSchema.optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    member_count: z.number(),
    type: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    list_id: z.string().optional(),
    options: OptionsSchema.optional()
});

const action = createAction({
    description: 'Create a segment in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name
        };

        if (input.static_segment !== undefined) {
            requestBody['static_segment'] = input.static_segment;
        }

        if (input.options !== undefined) {
            requestBody['options'] = input.options;
        }

        const response = await nango.post({
            // https://mailchimp.com/developer/marketing/api/list-segments/add-segment/
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/segments`,
            data: requestBody,
            retries: 1
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Mailchimp API'
            });
        }

        const providerSegment = ProviderSegmentSchema.parse(response.data);

        return {
            id: providerSegment.id,
            name: providerSegment.name,
            member_count: providerSegment.member_count,
            type: providerSegment.type,
            ...(providerSegment.created_at !== undefined && { created_at: providerSegment.created_at }),
            ...(providerSegment.updated_at !== undefined && { updated_at: providerSegment.updated_at }),
            ...(providerSegment.list_id !== undefined && { list_id: providerSegment.list_id }),
            ...(providerSegment.options !== undefined && { options: providerSegment.options })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
