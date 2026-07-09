import { createAction } from 'nango';
import * as z from 'zod';

const conversionEventResponseSchema = z.object({
    ad_account_id: z.string().optional(),
    conversion_event: z.string().optional(),
    conversion_tag_id: z.string().optional(),
    created_time: z.number().optional(),
    reporting_conversion_event: z.string().optional()
});

const outputSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(conversionEventResponseSchema)
});

const inputSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string().optional(),
    order: z.enum(['ASCENDING', 'DESCENDING']).optional(),
    page_size: z.number().int().min(1).max(250).optional()
});

const action = createAction({
    description: 'Get page visit conversion tags',
    version: '1.0.0',
    scopes: ['ads:read'],
    input: inputSchema,
    output: outputSchema,
    exec: async (nango, input) => {
        const queryParams: Record<string, string | number> = {};
        if (input.bookmark !== undefined) {
            queryParams['bookmark'] = input.bookmark;
        }
        if (input.order !== undefined) {
            queryParams['order'] = input.order;
        }
        if (input.page_size !== undefined) {
            queryParams['page_size'] = input.page_size;
        }

        const config: { endpoint: string; retries: number; params?: Record<string, string | number> } = {
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/conversion_tags/page_visit`,
            retries: 3
        };

        if (Object.keys(queryParams).length > 0) {
            config.params = queryParams;
        }

        // https://developers.pinterest.com/docs/api/v5/page_visit_conversion_tags-get/
        const response = await nango.get(config);

        const parsed = outputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Pinterest API',
                errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
