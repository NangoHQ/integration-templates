import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier or Ironclad ID of a workflow. Example: "6a6b328004308879e7d439b6"'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).max(100).optional().describe('Number of results to return per page. Defaults to 20.')
});

const TurnItemSchema = z.object({
    turnParty: z.string().optional(),
    turnStartTime: z.string().optional(),
    turnLocation: z.string().optional(),
    turnUserId: z.string().optional(),
    turnEndTime: z.string().optional(),
    turnNumber: z.number().int().optional(),
    turnUserEmail: z.string().optional()
});

const ProviderResponseSchema = z.object({
    page: z.number().int().optional(),
    pageSize: z.number().int().optional(),
    count: z.number().int().optional(),
    list: z.array(TurnItemSchema).optional()
});

const TurnSchema = z.object({
    turnParty: z.string().optional(),
    turnStartTime: z.string().optional(),
    turnLocation: z.string().optional(),
    turnUserId: z.string().optional(),
    turnEndTime: z.string().optional(),
    turnNumber: z.number().int().optional(),
    turnUserEmail: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TurnSchema),
    nextCursor: z.string().optional(),
    count: z.number().int().optional()
});

const action = createAction({
    description: 'List the turn-by-turn history of a workflow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readTurnHistory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(page)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid integer page number'
            });
        }

        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/turn-history
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/turn-history`,
            params: {
                page: page,
                ...(input.pageSize !== undefined && { pageSize: input.pageSize })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const items = providerData.list ?? [];
        const totalCount = providerData.count ?? 0;
        const currentPage = providerData.page ?? 0;
        const currentPageSize = providerData.pageSize ?? 20;
        const hasMore = items.length === currentPageSize && (currentPage + 1) * currentPageSize < totalCount;

        return {
            items: items.map((item) => ({
                ...(item.turnParty !== undefined && { turnParty: item.turnParty }),
                ...(item.turnStartTime !== undefined && { turnStartTime: item.turnStartTime }),
                ...(item.turnLocation !== undefined && { turnLocation: item.turnLocation }),
                ...(item.turnUserId !== undefined && { turnUserId: item.turnUserId }),
                ...(item.turnEndTime !== undefined && { turnEndTime: item.turnEndTime }),
                ...(item.turnNumber !== undefined && { turnNumber: item.turnNumber }),
                ...(item.turnUserEmail !== undefined && { turnUserEmail: item.turnUserEmail })
            })),
            ...(hasMore && { nextCursor: String(currentPage + 1) }),
            ...(totalCount !== undefined && { count: totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
