import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of warehouses to return. Defaults to 100.'),
    crossCompany: z.boolean().optional().describe('If true, queries across all companies. Defaults to false.')
});

const ProviderResponseSchema = z.object({
    value: z.array(z.object({}).passthrough()),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(z.object({}).passthrough()),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List warehouses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const params: Record<string, string | number> = {
            $top: limit,
            $skip: skip
        };

        if (input.crossCompany) {
            params['cross-company'] = 'true';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/Warehouses',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const nextCursor = parsed['@odata.nextLink'] ? String(skip + limit) : undefined;

        return {
            items: parsed.value,
            nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
