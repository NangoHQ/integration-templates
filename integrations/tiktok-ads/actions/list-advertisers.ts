import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderAdvertiserSchema = z.object({
    advertiser_id: z.string(),
    advertiser_name: z.string().optional(),
    status: z.string().optional(),
    create_time: z.string().optional(),
    role: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z
        .object({
            list: z.array(ProviderAdvertiserSchema).optional(),
            page_info: z
                .object({
                    page: z.number().optional(),
                    page_size: z.number().optional(),
                    total_number: z.number().optional(),
                    total_page: z.number().optional()
                })
                .optional(),
            cursor: z.string().optional(),
            has_more: z.boolean().optional()
        })
        .optional(),
    request_id: z.string().optional()
});

const AdvertiserSchema = z.object({
    advertiser_id: z.string(),
    advertiser_name: z.string().optional(),
    status: z.string().optional(),
    create_time: z.string().optional(),
    role: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(AdvertiserSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List advertisers from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-advertisers',
        group: 'Advertisers'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const integration = await nango.getIntegration({ include: ['credentials'] });
        const credentials = integration.credentials;

        if (!credentials || !('client_id' in credentials) || !credentials.client_id || !credentials.client_secret) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'Integration client_id and client_secret are required to call this endpoint.'
            });
        }

        const token = await nango.getToken();
        let accessToken = '';
        if (typeof token === 'string') {
            accessToken = token;
        } else if (token && typeof token === 'object' && 'access_token' in token) {
            const maybeToken = token.access_token;
            if (typeof maybeToken === 'string') {
                accessToken = maybeToken;
            }
        }

        if (!accessToken) {
            throw new nango.ActionError({
                type: 'missing_token',
                message: 'Unable to retrieve access token for the connection.'
            });
        }

        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1738455508553729
            endpoint: 'oauth2/advertiser/get/',
            params: {
                app_id: credentials.client_id,
                secret: credentials.client_secret,
                access_token: accessToken,
                ...(input.cursor !== undefined && input.cursor !== '' && { cursor: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: parsed.message,
                code: parsed.code,
                request_id: parsed.request_id
            });
        }

        if (!parsed.data) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response missing data field',
                raw: JSON.stringify(response.data)
            });
        }

        const items =
            parsed.data.list?.map((advertiser) => ({
                advertiser_id: advertiser.advertiser_id,
                ...(advertiser.advertiser_name != null && { advertiser_name: advertiser.advertiser_name }),
                ...(advertiser.status != null && { status: advertiser.status }),
                ...(advertiser.create_time != null && { create_time: advertiser.create_time }),
                ...(advertiser.role != null && { role: advertiser.role })
            })) ?? [];

        return {
            items,
            ...(parsed.data.cursor != null && { next_cursor: parsed.data.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
