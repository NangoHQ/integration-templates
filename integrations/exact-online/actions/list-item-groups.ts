import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor ($skip value). Omit for the first page.')
});

const ProviderItemGroupSchema = z.object({
    ID: z.string(),
    Code: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    Modified: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(ProviderItemGroupSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List logistics item groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ExactOnline.API.All'],
    endpoint: {
        path: '/actions/list-item-groups',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meResponse = await nango.get({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapibasics
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = z
            .object({
                d: z.object({
                    results: z.array(
                        z.object({
                            CurrentDivision: z.number().optional()
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

        const top = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapibasics
            endpoint: `/api/v1/${encodeURIComponent(String(currentDivision))}/logistics/ItemGroups`,
            params: {
                $select: 'ID,Code,Description,Modified',
                $top: String(top),
                $skip: String(skip),
                $orderby: 'Modified asc'
            },
            retries: 3
        });

        const responseData = z
            .object({
                d: z.object({
                    results: z.array(z.unknown())
                })
            })
            .parse(response.data);

        const items = responseData.d.results.map((item) => {
            const parsed = ProviderItemGroupSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_item_group',
                    message: 'Failed to parse item group from provider response.',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        const nextCursor = items.length === top ? String(skip + top) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
