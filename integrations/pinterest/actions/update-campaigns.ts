import { z } from 'zod';
import { createAction } from 'nango';

const CampaignUpdateSchema = z
    .object({
        id: z.string().describe('Campaign ID. Example: "626759223936"')
    })
    .passthrough();

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    campaigns: z.array(CampaignUpdateSchema).describe('Array of campaign updates. Each object must include `id` and the fields to change.')
});

const ExceptionSchema = z
    .object({
        message: z.string().optional(),
        error_code: z.number().optional()
    })
    .passthrough();

const CampaignItemSchema = z.object({
    data: z.object({}).passthrough().optional(),
    exceptions: z.array(ExceptionSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(CampaignItemSchema)
});

const action = createAction({
    description: 'Update one or more campaigns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input) => {
        const response = await nango.patch({
            // https://developers.pinterest.com/docs/api/v5/#operation/campaigns/update
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/campaigns`,
            data: input.campaigns,
            retries: 3
        });

        const providerResponse = OutputSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                ...(item.data !== undefined && { data: item.data }),
                ...(item.exceptions !== undefined && { exceptions: item.exceptions })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
