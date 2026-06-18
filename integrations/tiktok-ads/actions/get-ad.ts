import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_id: z.string().describe('Ad ID. Example: "1680067909753890"')
});

const AdSchema = z.object({
    ad_id: z.string(),
    advertiser_id: z.string().optional(),
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional(),
    adgroup_id: z.string().optional(),
    adgroup_name: z.string().optional(),
    ad_name: z.string().optional(),
    ad_text: z.string().optional().nullable(),
    ad_texts: z.array(z.string()).optional().nullable(),
    ad_format: z.string().optional().nullable(),
    status: z.string().optional(),
    opt_status: z.string().optional(),
    operation_status: z.string().optional().nullable(),
    secondary_status: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional(),
    landing_page_url: z.string().optional().nullable(),
    video_id: z.string().optional().nullable(),
    image_ids: z.array(z.string()).optional().nullable(),
    is_aco: z.boolean().optional().nullable(),
    call_to_action: z.string().optional().nullable(),
    open_url_type: z.string().optional().nullable(),
    display_name: z.string().optional().nullable()
});

const action = createAction({
    description: 'Retrieve a single ad from TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: AdSchema,
    scopes: ['ads.read'],

    exec: async (nango, input): Promise<z.infer<typeof AdSchema>> => {
        const connection = await nango.getConnection();
        const advertiserId = connection.connection_config?.['advertiser_id'];
        if (!advertiserId || typeof advertiserId !== 'string') {
            throw new nango.ActionError({
                type: 'missing_config',
                message: 'advertiser_id is required in connection config'
            });
        }

        const filtering = JSON.stringify({
            ad_ids: [input.ad_id]
        });

        // https://business-api.tiktok.com/portal/docs?id=1735735588640770
        const response = await nango.get({
            endpoint: 'ad/get/',
            params: {
                advertiser_id: advertiserId,
                filtering: filtering
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            code: z.number(),
            message: z.string(),
            data: z
                .object({
                    list: z.array(z.unknown())
                })
                .optional()
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from provider'
            });
        }

        const parsed = providerResponse.data;

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message,
                code: parsed.code
            });
        }

        const ads = parsed.data?.list ?? [];
        if (ads.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Ad not found: ${input.ad_id}`,
                ad_id: input.ad_id
            });
        }

        const ad = AdSchema.parse(ads[0]);

        return ad;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
