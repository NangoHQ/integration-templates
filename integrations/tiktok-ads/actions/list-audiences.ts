import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Page size. Value range: 1-100. Default: 10.')
});

const AudienceSchema = z.object({
    audience_id: z.string(),
    name: z.string().nullable().optional(),
    audience_type: z.string().nullable().optional(),
    cover_num: z.number().int().nullable().optional(),
    is_valid: z.boolean().nullable().optional(),
    is_expiring: z.boolean().nullable().optional(),
    is_creator: z.boolean().nullable().optional(),
    shared: z.boolean().nullable().optional(),
    calculate_type: z.string().nullable().optional(),
    create_time: z.string().nullable().optional(),
    expired_time: z.string().nullable().optional()
});

const PageInfoSchema = z.object({
    page: z.number().int(),
    page_size: z.number().int(),
    total_number: z.number().int(),
    total_page: z.number().int()
});

const ProviderResponseSchema = z.object({
    code: z.number().int(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            list: z.array(AudienceSchema),
            page_info: PageInfoSchema
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(AudienceSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List audiences from TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string'
            });
        }

        // https://business-api.tiktok.com/portal/docs?id=1739940506015746
        const response = await nango.get({
            endpoint: 'dmp/custom_audience/list/',
            params: {
                advertiser_id: input.advertiser_id,
                page: page,
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.safeParse(response.data);
        if (!raw.success) {
            throw new nango.ActionError({
                type: 'provider_response_invalid',
                message: 'Provider response did not match expected schema',
                details: raw.error.issues
            });
        }

        const providerData = raw.data;

        if (providerData.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.message || 'Unknown provider error',
                code: providerData.code,
                request_id: providerData.request_id
            });
        }

        if (!providerData.data) {
            throw new nango.ActionError({
                type: 'provider_response_invalid',
                message: 'Provider response missing data field'
            });
        }

        const nextPage = providerData.data.page_info.page < providerData.data.page_info.total_page ? String(providerData.data.page_info.page + 1) : undefined;

        return {
            items: providerData.data.list,
            ...(nextPage !== undefined && { next_cursor: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
