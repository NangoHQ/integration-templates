import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().describe('The unique ID of the campaign to delete. Example: "a1b2c3d4e5"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    campaign_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a campaign in Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-campaign'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://mailchimp.com/developer/marketing/api/campaigns/
        await nango.delete({
            endpoint: `/3.0/campaigns/${encodeURIComponent(input.campaign_id)}`,
            retries: 1
        });

        return {
            success: true,
            campaign_id: input.campaign_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
