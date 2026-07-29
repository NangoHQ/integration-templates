import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from a previous response. Omit for the first page.')
});

const CurrencySchema = z.object({
    CurrencyCode: z.string(),
    Name: z.string().optional().nullable(),
    Symbol: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(CurrencySchema),
    next_cursor: z.string().optional()
});

const ODataResponseSchema = z.object({
    value: z.array(z.object({}).passthrough()),
    '@odata.nextLink': z.string().optional()
});

const action = createAction({
    description: 'List currencies configured for the tenant.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.cursor) {
            params['$skiptoken'] = input.cursor;
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/Currencies',
            params,
            retries: 3
        };

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Empty response from provider.'
            });
        }

        const parsed = ODataResponseSchema.parse(response.data);

        const items = parsed.value.map((item) => {
            const currency = CurrencySchema.safeParse(item);
            if (!currency.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected currency shape from provider.',
                    details: currency.error.issues
                });
            }
            return currency.data;
        });

        let next_cursor: string | undefined;
        if (parsed['@odata.nextLink']) {
            const nextLinkUrl = new URL(parsed['@odata.nextLink']);
            const skiptoken = nextLinkUrl.searchParams.get('$skiptoken');
            if (skiptoken) {
                next_cursor = skiptoken;
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
