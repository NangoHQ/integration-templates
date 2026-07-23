import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor ($skip value) from the previous response. Omit for the first page.'),
    top: z.number().optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    filter: z.string().optional().describe('OData $filter expression to filter results.'),
    cross_company: z.boolean().optional().describe('Query across all companies instead of the default company.')
});

const ProviderListResponseSchema = z.object({
    value: z.array(z.record(z.string(), z.unknown())),
    '@odata.nextLink': z.string().optional(),
    '@odata.count': z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(z.record(z.string(), z.unknown())),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List vendors.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const params: Record<string, string | number> = {
            $top: input.top ?? 100
        };

        if (input.cursor !== undefined) {
            params['$skip'] = input.cursor;
        }

        if (input.filter !== undefined) {
            params['$filter'] = input.filter;
        }

        if (input.cross_company !== undefined) {
            params['cross-company'] = input.cross_company ? 'true' : 'false';
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorsV2',
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderListResponseSchema.parse(response.data);
        const items = parsed.value;

        let next_cursor: string | undefined;
        if (parsed['@odata.nextLink'] !== undefined) {
            const url = new URL(parsed['@odata.nextLink']);
            const skip = url.searchParams.get('$skip');
            if (skip !== null) {
                next_cursor = skip;
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
