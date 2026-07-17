import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Maximum number of items to return per page. Defaults to 10.')
});

const OutputItemSchema = z.object({
    sys_id: z.string().min(1),
    name: z.string().min(1),
    short_description: z.string().optional(),
    description: z.string().optional(),
    active: z.string().optional(),
    price: z.string().optional(),
    category: z.string().optional(),
    sys_class_name: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const ProviderItemSchema = z.object({
    sys_id: z.unknown(),
    name: z.unknown(),
    short_description: z.unknown(),
    description: z.unknown(),
    active: z.unknown(),
    price: z.unknown(),
    category: z.unknown(),
    sys_class_name: z.unknown()
});

const ProviderResponseSchema = z.object({
    result: z.array(z.unknown())
});

const action = createAction({
    description: 'List service catalog items.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 10;

        let offset = 0;
        if (input.cursor !== undefined) {
            if (!/^\d+$/.test(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            offset = Number(input.cursor);
            if (!Number.isSafeInteger(offset)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
        }

        const config: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api
            endpoint: '/api/now/table/sc_cat_item',
            params: {
                sysparm_query: 'active=true',
                sysparm_limit: String(limit),
                sysparm_offset: String(offset)
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from ServiceNow Table API.'
            });
        }

        const items: z.infer<typeof OutputItemSchema>[] = [];
        for (const item of parsedResponse.data.result) {
            const parsedItem = ProviderItemSchema.safeParse(item);
            if (!parsedItem.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected item format in response.'
                });
            }

            const record = parsedItem.data;
            // A catalog item without a valid, non-empty sys_id or name would be unaddressable to callers, so skip it.
            if (typeof record.sys_id !== 'string' || record.sys_id.length === 0 || typeof record.name !== 'string' || record.name.length === 0) {
                continue;
            }

            items.push({
                sys_id: record.sys_id,
                name: record.name,
                ...(typeof record.short_description === 'string' && { short_description: record.short_description }),
                ...(typeof record.description === 'string' && { description: record.description }),
                ...(typeof record.active === 'string' && { active: record.active }),
                ...(typeof record.price === 'string' && { price: record.price }),
                ...(typeof record.category === 'string' && { category: record.category }),
                ...(typeof record.sys_class_name === 'string' && { sys_class_name: record.sys_class_name })
            });
        }

        const linkHeader =
            typeof response.headers === 'object' && response.headers !== null ? (response.headers['link'] ?? response.headers['Link']) : undefined;
        const hasNext = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');

        return {
            items,
            ...(hasNext && { next_cursor: String(offset + limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
