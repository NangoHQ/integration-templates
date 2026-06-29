import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderItemSchema = z.object({
    ID: z.string(),
    Code: z.string().optional(),
    Description: z.string().optional(),
    ItemGroup: z.string().optional(),
    IsSalesItem: z.boolean().optional(),
    IsPurchaseItem: z.boolean().optional(),
    Modified: z.string().optional()
});

const OutputItemSchema = z.object({
    ID: z.string(),
    Code: z.string().optional(),
    Description: z.string().optional(),
    ItemGroup: z.string().optional(),
    IsSalesItem: z.boolean().optional(),
    IsPurchaseItem: z.boolean().optional(),
    Modified: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List logistics items/products.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Items'],
    endpoint: {
        path: '/actions/list-items',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meConfig: ProxyConfiguration = {
            // https://start.exactonline.fr/docs/services/Me/GET/current/Me
            endpoint: '/api/v1/current/Me',
            retries: 3
        };

        const meResponse = await nango.get(meConfig);

        const meData = z
            .object({
                d: z.object({
                    results: z.array(
                        z.object({
                            CurrentDivision: z.number()
                        })
                    )
                })
            })
            .parse(meResponse.data);

        const currentDivision = meData.d.results[0]?.CurrentDivision;
        if (!currentDivision) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from Me endpoint.'
            });
        }

        const top = 50;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid pagination cursor.'
            });
        }

        const itemsConfig: ProxyConfiguration = {
            // https://start.exactonline.fr/docs/services/Items/GET/logistics/Items
            endpoint: `/api/v1/${encodeURIComponent(String(currentDivision))}/logistics/Items`,
            params: {
                $select: 'ID,Code,Description,ItemGroup,IsSalesItem,IsPurchaseItem,Modified',
                $top: String(top),
                $skip: String(skip),
                $orderby: 'Modified asc'
            },
            retries: 3
        };

        const response = await nango.get(itemsConfig);

        const data = response.data;
        let results: unknown[];
        let hasMore = false;

        const outerSchema = z.object({
            d: z.union([
                z.array(z.unknown()),
                z.object({
                    results: z.array(z.unknown()),
                    __next: z.string().optional()
                })
            ])
        });

        const parsed = outerSchema.parse(data);

        if (Array.isArray(parsed.d)) {
            results = parsed.d;
            hasMore = parsed.d.length === top;
        } else {
            results = parsed.d.results;
            hasMore = parsed.d.__next !== undefined;
        }

        const items = results.map((rawItem: unknown) => {
            const item = ProviderItemSchema.parse(rawItem);
            return {
                ID: item.ID,
                ...(item.Code !== undefined && { Code: item.Code }),
                ...(item.Description !== undefined && { Description: item.Description }),
                ...(item.ItemGroup !== undefined && { ItemGroup: item.ItemGroup }),
                ...(item.IsSalesItem !== undefined && { IsSalesItem: item.IsSalesItem }),
                ...(item.IsPurchaseItem !== undefined && { IsPurchaseItem: item.IsPurchaseItem }),
                ...(item.Modified !== undefined && { Modified: item.Modified })
            };
        });

        const nextCursor = hasMore ? String(skip + top) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
