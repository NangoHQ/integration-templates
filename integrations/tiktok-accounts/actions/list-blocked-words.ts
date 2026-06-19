import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('TikTok advertiser ID. Example: "7644132249303924753"'),
    page: z.number().optional().describe('Page number for pagination. Defaults to 1.'),
    page_size: z.number().optional().describe('Number of results per page. Defaults to 10.')
});

const PageInfoSchema = z.object({
    page: z.number().optional(),
    page_size: z.number().optional(),
    total_number: z.number().optional(),
    total_page: z.number().optional()
});

const BlockedWordSchema = z.object({
    bw_content: z.string().optional()
});

const ProviderDataSchema = z.object({
    list: z.array(BlockedWordSchema).optional(),
    page_info: PageInfoSchema.optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: ProviderDataSchema.optional()
});

const OutputSchema = z.object({
    blocked_words: z.array(z.string()),
    page_info: z
        .object({
            page: z.number().optional(),
            page_size: z.number().optional(),
            total_number: z.number().optional(),
            total_page: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve the blocked word list for automatic comment moderation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tt_user'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const accessToken = connection.credentials && connection.credentials.type === 'OAUTH2' ? connection.credentials.access_token : undefined;

        const headers: Record<string, string> = {};
        if (accessToken) {
            headers['Access-Token'] = accessToken;
        }

        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1739029260837889
            endpoint: '/blockedword/list/',
            headers,
            params: {
                advertiser_id: input.advertiser_id,
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Unknown provider error',
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        const data = providerResponse.data || {};
        const list = data.list || [];
        const pageInfo = data.page_info;

        return {
            blocked_words: list.filter((item) => item.bw_content !== undefined).map((item) => item.bw_content!),
            ...(pageInfo !== undefined && {
                page_info: {
                    ...(pageInfo.page !== undefined && { page: pageInfo.page }),
                    ...(pageInfo.page_size !== undefined && { page_size: pageInfo.page_size }),
                    ...(pageInfo.total_number !== undefined && { total_number: pageInfo.total_number }),
                    ...(pageInfo.total_page !== undefined && { total_page: pageInfo.total_page })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
