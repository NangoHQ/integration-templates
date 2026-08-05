import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    query: z.string().optional().describe('Filter by id, uuid, form id, or form uuid.')
});

const FormViewSchema = z
    .object({
        id: z.number(),
        uuid: z.string(),
        form_id: z.number(),
        form_uuid: z.string(),
        schema: z.unknown().optional(),
        custom_css: z.string().optional(),
        iframe: z.unknown().optional(),
        embed_code: z.string().optional()
    })
    .passthrough();

const MetaSchema = z.object({
    count: z.number(),
    page: z.number(),
    per_page: z.number()
});

const OutputSchema = z.object({
    form_views: z.array(FormViewSchema),
    meta: MetaSchema,
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Form Views configured on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number.'
            });
        }

        const params: Record<string, string | number> = {
            page: page
        };
        if (input.query !== undefined) {
            params['query'] = input.query;
        }

        // https://docs.usebasin.com/developer-features/api-reference/
        const config: Omit<ProxyConfiguration, 'method'> = {
            endpoint: '/v1/form_views',
            params: params,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Basin API.'
            });
        }

        const providerResponse = z
            .object({
                form_views: z.array(z.unknown()).default([]),
                meta: z.object({
                    count: z.number(),
                    page: z.number(),
                    per_page: z.number()
                })
            })
            .parse(response.data);

        const form_views = providerResponse.form_views.map((item) => {
            const parsed = FormViewSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'unexpected_response',
                    message: 'Invalid form view shape in response.',
                    detail: parsed.error.message
                });
            }
            return parsed.data;
        });

        const hasMore = providerResponse.meta.count > providerResponse.meta.page * providerResponse.meta.per_page;
        const next_cursor = hasMore ? String(providerResponse.meta.page + 1) : undefined;

        return {
            form_views: form_views,
            meta: providerResponse.meta,
            ...(next_cursor !== undefined && { next_cursor: next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
