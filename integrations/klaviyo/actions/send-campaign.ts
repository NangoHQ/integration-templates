import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().describe('The ID of the campaign to send. Example: "01KWGH6P9PERJ0AHGNBJQMH55G"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            status: z.string()
        }),
        links: z.object({
            self: z.string()
        })
    }),
    links: z.object({
        self: z.string()
    })
});

const OutputSchema = z.object({
    campaign_id: z.string(),
    status: z.string(),
    send_job_type: z.string()
});

const action = createAction({
    description: 'Send a campaign immediately.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/send_campaign
            endpoint: '/api/campaign-send-jobs',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'campaign-send-job',
                    id: input.campaign_id
                }
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            campaign_id: providerResponse.data.id,
            status: providerResponse.data.attributes.status,
            send_job_type: providerResponse.data.type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
