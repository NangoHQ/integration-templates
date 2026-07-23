import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response (skip offset). Omit for the first page.'),
    limit: z.number().int().positive().optional().describe('Maximum number of records to return. Defaults to 100.'),
    cross_company: z.boolean().optional().describe('If true, query across all companies instead of just the default company.')
});

const ProviderPaymentTermSchema = z
    .object({
        dataAreaId: z.string(),
        Name: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderPaymentTermSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List payment terms.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? Number(input.cursor) : 0;

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/PaymentTerms',
            params: {
                $top: String(limit),
                $skip: String(skip),
                ...(input.cross_company && { 'cross-company': 'true' })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => ProviderPaymentTermSchema.parse(item));

        let nextCursor: string | undefined;
        if (providerResponse['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it
            // wants us to use next. nextLink may be an absolute URL or a relative path, so parse it
            // against a fixed base to support both.
            const nextUrl = new URL(providerResponse['@odata.nextLink'], 'https://dynamics.local');
            const skipParam = nextUrl.searchParams.get('$skip');
            nextCursor = skipParam ?? String(skip + items.length);
        } else if (items.length === limit) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + limit);
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
