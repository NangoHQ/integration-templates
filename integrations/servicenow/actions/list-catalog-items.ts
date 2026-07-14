import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Maximum number of items to return per page. Defaults to 10.')
});

const OutputItemSchema = z.object({
    sys_id: z.string(),
    name: z.string(),
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
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid pagination cursor.'
            });
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

        const items = parsedResponse.data.result.map((item) => {
            const parsedItem = ProviderItemSchema.safeParse(item);
            if (!parsedItem.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected item format in response.'
                });
            }

            const record = parsedItem.data;
            return {
                sys_id: typeof record.sys_id === 'string' ? record.sys_id : '',
                name: typeof record.name === 'string' ? record.name : '',
                ...(typeof record.short_description === 'string' && { short_description: record.short_description }),
                ...(typeof record.description === 'string' && { description: record.description }),
                ...(typeof record.active === 'string' && { active: record.active }),
                ...(typeof record.price === 'string' && { price: record.price }),
                ...(typeof record.category === 'string' && { category: record.category }),
                ...(typeof record.sys_class_name === 'string' && { sys_class_name: record.sys_class_name })
            };
        });

        const linkHeader = response.headers?.['link'];
        const hasNext = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');

        return {
            items,
            ...(hasNext && { next_cursor: String(offset + limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
