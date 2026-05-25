import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Maximum number of items to return per page. Default is 10.'),
    status: z.string().optional().describe('Limit results to webhooks with a specific status. Options: all, active, paused, disabled.'),
    search: z.string().optional().describe('Limit results to those matching a string.'),
    after: z.string().optional().describe('Limit response to resources published after a given ISO8601 compliant date.'),
    before: z.string().optional().describe('Limit response to resources published before a given ISO8601 compliant date.'),
    order: z.string().optional().describe('Order sort attribute ascending or descending. Options: asc, desc.'),
    orderby: z.string().optional().describe('Sort collection by object attribute. Options: date, id, include, title, slug.')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    topic: z.string(),
    resource: z.string(),
    event: z.string(),
    hooks: z.array(z.string()),
    delivery_url: z.string(),
    secret: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_created_gmt: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    date_modified_gmt: z.string().nullable().optional()
});

const OutputWebhookSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    topic: z.string(),
    resource: z.string(),
    event: z.string(),
    hooks: z.array(z.string()),
    delivery_url: z.string(),
    secret: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputWebhookSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List webhooks from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-webhooks'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-webhooks
            endpoint: '/wp-json/wc/v3/webhooks',
            params: {
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.after !== undefined && { after: input.after }),
                ...(input.before !== undefined && { before: input.before }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.orderby !== undefined && { orderby: input.orderby })
            },
            retries: 3
        });

        const providerWebhooks = z.array(z.unknown()).parse(response.data);
        const items = providerWebhooks.map((item) => {
            const parsed = ProviderWebhookSchema.parse(item);
            return {
                id: parsed.id,
                name: parsed.name,
                status: parsed.status,
                topic: parsed.topic,
                resource: parsed.resource,
                event: parsed.event,
                hooks: parsed.hooks,
                delivery_url: parsed.delivery_url,
                ...(parsed.secret != null && { secret: parsed.secret }),
                ...(parsed.date_created != null && { date_created: parsed.date_created }),
                ...(parsed.date_created_gmt != null && { date_created_gmt: parsed.date_created_gmt }),
                ...(parsed.date_modified != null && { date_modified: parsed.date_modified }),
                ...(parsed.date_modified_gmt != null && { date_modified_gmt: parsed.date_modified_gmt })
            };
        });

        const totalPagesHeader = response.headers['x-wp-totalpages'];
        const totalPages = totalPagesHeader ? parseInt(String(totalPagesHeader), 10) : 0;
        const hasNextPage = totalPages > 0 && page < totalPages;

        return {
            items,
            ...(hasNextPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
