import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip value). Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return. Defaults to 100.'),
    modified_after: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/, 'modified_after must be a valid ISO 8601 datetime')
        .optional()
        .describe("ISO 8601 datetime to filter accounts modified after this date. Example: '2024-01-01T00:00:00Z'")
});

const ProviderGLAccountSchema = z.object({
    ID: z.string(),
    Code: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    Modified: z.string().optional().nullable()
});

const GLAccountItemSchema = z.object({
    ID: z.string(),
    Code: z.string().optional(),
    Description: z.string().optional(),
    Modified: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(GLAccountItemSchema),
    next_cursor: z.string().optional()
});

const MeResponseSchema = z
    .object({
        d: z
            .object({
                results: z
                    .array(
                        z
                            .object({
                                CurrentDivision: z.number().optional().nullable()
                            })
                            .passthrough()
                    )
                    .optional()
            })
            .optional()
    })
    .or(
        z.object({
            value: z
                .array(
                    z
                        .object({
                            CurrentDivision: z.number().optional().nullable()
                        })
                        .passthrough()
                )
                .optional()
        })
    );

const GLAccountsResponseSchema = z
    .object({
        d: z
            .object({
                results: z.array(ProviderGLAccountSchema.passthrough()).optional(),
                __next: z.string().optional().nullable()
            })
            .optional()
    })
    .or(
        z.object({
            value: z.array(ProviderGLAccountSchema.passthrough()).optional(),
            '@odata.nextLink': z.string().optional().nullable()
        })
    );

const action = createAction({
    description: 'List general ledger accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['financial'],
    endpoint: {
        path: '/actions/list-gl-accounts',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-docs
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);

        let currentDivision: number | undefined;
        if ('d' in meData && meData.d?.results?.[0]?.CurrentDivision) {
            currentDivision = meData.d.results[0].CurrentDivision;
        } else if ('value' in meData && meData.value?.[0]?.CurrentDivision) {
            currentDivision = meData.value[0].CurrentDivision;
        }

        if (!currentDivision) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Unable to determine current division from the Exact Online API.'
            });
        }

        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer representing the skip value.'
            });
        }

        const params: Record<string, string> = {
            $select: 'ID,Code,Description,Modified',
            $top: String(limit),
            $skip: String(skip)
        };

        if (input.modified_after) {
            params['$filter'] = `Modified gt datetime'${input.modified_after}'`;
        }

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-docs
        const response = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(String(currentDivision))}/financial/GLAccounts`,
            params,
            retries: 3
        });

        const responseData = GLAccountsResponseSchema.parse(response.data);

        let providerItems: Array<z.infer<typeof ProviderGLAccountSchema>> = [];
        let nextLink: string | null | undefined;

        if ('d' in responseData && responseData.d?.results) {
            providerItems = responseData.d.results;
            nextLink = responseData.d.__next;
        } else if ('value' in responseData && responseData.value) {
            providerItems = responseData.value;
            nextLink = responseData['@odata.nextLink'];
        }

        const items = providerItems.map((item) => ({
            ID: item.ID,
            ...(item.Code != null && { Code: item.Code }),
            ...(item.Description != null && { Description: item.Description }),
            ...(item.Modified != null && { Modified: item.Modified })
        }));

        let next_cursor: string | undefined;
        if (nextLink) {
            next_cursor = String(skip + limit);
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
