import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    top: z.number().int().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    filter: z.string().optional().describe('OData $filter expression to apply.'),
    cross_company: z.boolean().optional().describe('If true, include records from all companies (appends cross-company=true).')
});

const ProviderResponseSchema = z.object({
    value: z.array(z.record(z.string(), z.unknown())),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(z.record(z.string(), z.unknown())),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List sales order headers.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const top = input.top ?? 100;
        const skip = input.cursor ? Number(input.cursor) : 0;

        if (Number.isNaN(skip) || skip < 0 || !Number.isInteger(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer representing the $skip offset.'
            });
        }

        const params: Record<string, string> = {
            $top: String(top),
            $skip: String(skip)
        };

        if (input.filter) {
            params['$filter'] = input.filter;
        }

        if (input.cross_company) {
            params['cross-company'] = 'true';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesOrderHeadersV2',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = providerResponse.value;
        const next_cursor = providerResponse['@odata.nextLink'] !== undefined ? String(skip + top) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
