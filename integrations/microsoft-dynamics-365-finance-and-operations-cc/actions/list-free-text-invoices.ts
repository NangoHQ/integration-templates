import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('OData nextLink from the previous response. Omit for the first page.'),
    cross_company: z.boolean().optional().describe('If true, include records from all companies.')
});

const ProviderInvoiceSchema = z
    .object({
        InvoiceIdentifier: z.number().describe('Numeric surrogate id. Example: 5637144588'),
        FreeTextNumber: z.string().optional().nullable(),
        dataAreaId: z.string().optional().nullable()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        value: z.array(ProviderInvoiceSchema),
        ['@odata.nextLink']: z.string().optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(ProviderInvoiceSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List free text (miscellaneous) customer invoice headers.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        let endpoint = '/data/FreeTextInvoiceHeaders';
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            const cursorUrl = new URL(input.cursor, 'https://dummy.example');
            endpoint = cursorUrl.pathname;
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            params['$top'] = 100;
            if (input.cross_company) {
                params['cross-company'] = 'true';
            }
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.value,
            ...(providerResponse['@odata.nextLink'] != null && { nextCursor: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
