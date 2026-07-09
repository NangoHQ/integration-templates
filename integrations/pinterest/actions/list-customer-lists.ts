import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Number of items per page. Example: 25')
});

const CustomerListSchema = z.object({
    ad_account_id: z.string().optional(),
    created_time: z.number().optional(),
    exceptions: z.object({}).passthrough().optional(),
    id: z.string(),
    is_nca: z.boolean().optional(),
    name: z.string(),
    num_batches: z.number().optional(),
    num_removed_user_records: z.number().optional(),
    num_uploaded_user_records: z.number().optional(),
    status: z.enum(['PROCESSING', 'READY', 'TOO_SMALL', 'UPLOADING']).optional(),
    type: z.string().optional(),
    updated_time: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(CustomerListSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List uploaded customer (match audience) lists.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/customer_lists/list
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/customer_lists`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('items' in raw) || !Array.isArray(raw.items)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.'
            });
        }

        const items = raw.items.map((item: unknown) => {
            const parsed = CustomerListSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Provider returned a customer list item that does not match the expected schema.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        const nextCursor = typeof raw.bookmark === 'string' ? raw.bookmark : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
