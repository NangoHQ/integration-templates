import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.'),
    pageSize: z
        .number()
        .int()
        .min(100)
        .max(10000)
        .optional()
        .describe('The amount of API tokens in a single response payload. Must be between 100 and 10000. Defaults to 100.')
});

const ApiTokenSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    owner: z.string().optional(),
    enabled: z.boolean().optional(),
    personalAccessToken: z.boolean().optional(),
    creationDate: z.string().optional(),
    expirationDate: z.string().optional(),
    lastUsedDate: z.string().optional(),
    lastUsedIpAddress: z.string().optional(),
    modifiedDate: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    additionalMetadata: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    apiTokens: z.array(ApiTokenSchema),
    nextPageKey: z.string().nullable().optional()
});

const OutputSchema = z.object({
    apiTokens: z.array(ApiTokenSchema),
    nextPageKey: z.string().optional()
});

const action = createAction({
    description: 'List API tokens configured in this environment (metadata only, not the secret values).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['apiTokens.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/tokens-v2/api-tokens/get-all
            endpoint: '/api/v2/apiTokens',
            params: input.cursor
                ? { nextPageKey: input.cursor }
                : {
                      pageSize: String(input.pageSize ?? 100)
                  },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Dynatrace API'
            });
        }

        return {
            apiTokens: providerResponse.data.apiTokens,
            ...(providerResponse.data.nextPageKey != null && { nextPageKey: providerResponse.data.nextPageKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
