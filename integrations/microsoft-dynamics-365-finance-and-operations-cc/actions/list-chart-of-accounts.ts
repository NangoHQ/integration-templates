import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    dataAreaId: z.string().optional().describe('Company code / data area ID. Example: "dat"')
});

const ProviderItemSchema = z
    .object({
        '@odata.etag': z.string().optional(),
        ChartOfAccounts: z.string(),
        MainAccountMask: z.string().optional(),
        ChartOfAccountsRecId: z.number().optional(),
        Description: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderItemSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List charts of accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative numeric skip value.'
            });
        }

        const params: Record<string, string | number> = {
            $top: pageSize,
            $skip: skip
        };

        if (input.dataAreaId) {
            params['$filter'] = `dataAreaId eq '${input.dataAreaId}'`;
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/ChartOfAccounts',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => {
            const parsed = ProviderItemSchema.parse(item);
            return parsed;
        });

        const nextCursor = providerResponse['@odata.nextLink'] != null ? String(skip + pageSize) : undefined;

        return {
            items,
            ...(nextCursor != null && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
