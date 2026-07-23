import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (OData $skip value). Omit for the first page.'),
    limit: z.number().int().positive().optional().describe('Maximum number of records to return. Defaults to 100.')
});

const ProviderMainAccountSchema = z
    .object({
        MainAccountId: z.string(),
        Name: z.string().optional().nullable(),
        ChartOfAccounts: z.string().optional().nullable(),
        MainAccountType: z.string().optional().nullable(),
        MainAccountCategory: z.string().optional().nullable(),
        DefaultCurrency: z.string().optional().nullable()
    })
    .passthrough();

const OutputItemSchema = z.object({
    MainAccountId: z.string(),
    Name: z.string().optional(),
    ChartOfAccounts: z.string().optional(),
    MainAccountType: z.string().optional(),
    MainAccountCategory: z.string().optional(),
    DefaultCurrency: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List general ledger main accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit <= 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'limit must be a positive integer.'
            });
        }
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/MainAccounts',
            params: {
                $top: String(limit),
                $skip: String(skip),
                $count: 'true'
            },
            retries: 3
        });

        const responseData = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = responseData.value.map((item) => {
            const account = ProviderMainAccountSchema.parse(item);
            return {
                MainAccountId: account.MainAccountId,
                ...(account.Name != null && { Name: account.Name }),
                ...(account.ChartOfAccounts != null && { ChartOfAccounts: account.ChartOfAccounts }),
                ...(account.MainAccountType != null && { MainAccountType: account.MainAccountType }),
                ...(account.MainAccountCategory != null && { MainAccountCategory: account.MainAccountCategory }),
                ...(account.DefaultCurrency != null && { DefaultCurrency: account.DefaultCurrency })
            };
        });

        let nextCursor: string | undefined;
        if (responseData['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const nextUrl = new URL(responseData['@odata.nextLink']);
            const skipParam = nextUrl.searchParams.get('$skip');
            nextCursor = skipParam ?? String(skip + items.length);
        } else if (items.length === limit) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + limit);
        }

        return {
            items,
            ...(nextCursor != null && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
