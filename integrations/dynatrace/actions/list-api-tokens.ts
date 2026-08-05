import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    pageSize: z
        .number()
        .int()
        .min(100)
        .max(10000)
        .optional()
        .describe('Number of items per page. Must be between 100 and 10000. Defaults to 100.')
});

const ProviderApiTokenSchema = z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    owner: z.string(),
    creationDate: z.string().optional(),
    expirationDate: z.string().optional(),
    lastUsedDate: z.string().optional(),
    lastUsedIpAddress: z.string().optional(),
    modifiedDate: z.string().optional(),
    personalAccessToken: z.boolean().optional(),
    scopes: z.array(z.string()).optional(),
    additionalMetadata: z.unknown().optional()
});

const ProviderApiTokenListSchema = z.object({
    apiTokens: z.array(ProviderApiTokenSchema),
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number(),
    totalCount: z.number()
});

const OutputSchema = z.object({
    items: z.array(ProviderApiTokenSchema),
    nextPageKey: z.string().optional(),
    pageSize: z.number(),
    totalCount: z.number()
});

const action = createAction({
    description: 'List API tokens configured in this environment (metadata only, not the secret values).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['apiTokens.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Dynatrace rejects continuation requests that include any parameter besides nextPageKey.
        const params: Record<string, string | number> = input.cursor
            ? { nextPageKey: input.cursor }
            : { pageSize: input.pageSize ?? 100 };

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/tokens-v2/api-tokens/get-all
            endpoint: '/api/v2/apiTokens',
            params,
            retries: 3
        });

        const providerList = ProviderApiTokenListSchema.parse(response.data);

        return {
            items: providerList.apiTokens,
            ...(providerList.nextPageKey != null && { nextPageKey: providerList.nextPageKey }),
            pageSize: providerList.pageSize,
            totalCount: providerList.totalCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
