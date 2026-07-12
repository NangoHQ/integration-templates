import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('The unique identifier of the ad account. Example: "549770573673"'),
    name: z.string().describe('Name of the customer segment. Example: "My Segment"'),
    audience_ids: z.array(z.string()).describe('Array of audience IDs to include in the segment. Example: ["2542623499735"]')
});

const ProviderCustomerSegmentSchema = z.object({
    ad_account_id: z.string().optional(),
    audience_ids: z.array(z.string()),
    created_time: z.number().optional(),
    id: z.string().optional(),
    name: z.string(),
    status: z.string().optional(),
    updated_time: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    ad_account_id: z.string().optional(),
    name: z.string(),
    audience_ids: z.array(z.string()),
    status: z.string().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional()
});

const action = createAction({
    description: 'Create a customer segment from existing audiences.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/customer_segment/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/customer_segments`,
            data: {
                name: input.name,
                audience_ids: input.audience_ids
            },
            retries: 10
        });

        const providerSegment = ProviderCustomerSegmentSchema.parse(response.data);

        return {
            ...(providerSegment.id !== undefined && { id: providerSegment.id }),
            ...(providerSegment.ad_account_id !== undefined && { ad_account_id: providerSegment.ad_account_id }),
            name: providerSegment.name,
            audience_ids: providerSegment.audience_ids,
            ...(providerSegment.status !== undefined && { status: providerSegment.status }),
            ...(providerSegment.created_time !== undefined && { created_time: providerSegment.created_time }),
            ...(providerSegment.updated_time !== undefined && { updated_time: providerSegment.updated_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
