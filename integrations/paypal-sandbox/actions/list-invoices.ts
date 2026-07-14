import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().int().min(1).optional().describe('Page number for pagination. Example: 1'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of items per page. Example: 20'),
    total_required: z.boolean().optional().describe('Whether to return total_pages and total_items in the response. Example: true')
});

const ProviderLinkSchema = z
    .object({
        href: z.string().optional(),
        rel: z.string().optional(),
        method: z.string().optional()
    })
    .passthrough();

const ProviderInvoiceSchema = z
    .object({
        id: z.string(),
        status: z.string().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderInvoiceSchema).optional(),
    total_items: z.number().optional(),
    total_pages: z.number().optional(),
    links: z.array(ProviderLinkSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderInvoiceSchema),
    total_items: z.number().optional(),
    total_pages: z.number().optional(),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List invoices.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/invoicing/invoices/read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.paypal.com/docs/api/invoicing/v2/#invoices_list
            endpoint: '/v2/invoicing/invoices',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.total_required !== undefined && { total_required: String(input.total_required) })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);
        const items = providerResponse.items ?? [];
        const currentPage = input.page ?? 1;

        // PayPal only includes total_pages when total_required=true, so relying on it would leave callers
        // without a next_page on default calls even when more invoices exist. The `next` HATEOAS link is
        // always present when there's another page, regardless of total_required.
        const nextLink = providerResponse.links?.find((link) => link.rel === 'next');
        const nextPageFromLink = nextLink?.href ? Number(new URL(nextLink.href).searchParams.get('page')) : undefined;
        const nextPage =
            nextPageFromLink !== undefined && Number.isInteger(nextPageFromLink)
                ? nextPageFromLink
                : providerResponse.total_pages !== undefined && currentPage < providerResponse.total_pages
                  ? currentPage + 1
                  : undefined;

        return {
            items,
            ...(providerResponse.total_items !== undefined && { total_items: providerResponse.total_items }),
            ...(providerResponse.total_pages !== undefined && { total_pages: providerResponse.total_pages }),
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
