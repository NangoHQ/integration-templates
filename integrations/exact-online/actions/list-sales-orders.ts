import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of results per page. Default: 50.'),
    modifiedAfter: z.string().optional().describe('ISO 8601 timestamp to filter orders modified after this date. Example: "2024-01-01T00:00:00Z"')
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const SalesOrderSchema = z.object({
    OrderID: z.string(),
    OrderNumber: z.number().optional().nullable(),
    OrderedBy: z.string().nullable().optional(),
    AmountDC: z.number().nullable().optional(),
    Modified: z.string().nullable().optional(),
    Status: z.number().nullable().optional()
});

const SalesOrdersResponseSchema = z.object({
    d: z.union([
        z.array(SalesOrderSchema),
        z.object({
            results: z.array(SalesOrderSchema).optional(),
            __next: z.string().optional()
        })
    ]),
    __next: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            OrderID: z.string(),
            OrderNumber: z.number().optional(),
            OrderedBy: z.string().optional(),
            AmountDC: z.number().optional(),
            Modified: z.string().optional(),
            Status: z.number().optional()
        })
    ),
    NextCursor: z.string().optional()
});

const action = createAction({
    description: 'List sales orders.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SalesOrders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meResponse = await nango.get({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Simulation-gen-me-MyDetails
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const division = meData.d.results[0]?.CurrentDivision;

        if (!division) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from Me endpoint.'
            });
        }

        const limit = input.limit ?? 50;
        const skip = input.cursor ? Number(input.cursor) : 0;

        if (Number.isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid pagination cursor.'
            });
        }

        const salesOrdersResponse = await nango.get({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Simulation-sales-sales-orders
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/salesorder/SalesOrders`,
            params: {
                $select: 'OrderID,OrderNumber,OrderedBy,AmountDC,Modified,Status',
                $top: String(limit),
                ...(skip > 0 && { $skip: String(skip) }),
                ...(input.modifiedAfter && { $filter: `Modified gt datetime'${input.modifiedAfter}'` })
            },
            retries: 3
        });

        const salesOrdersData = SalesOrdersResponseSchema.parse(salesOrdersResponse.data);
        const results = Array.isArray(salesOrdersData.d) ? salesOrdersData.d : (salesOrdersData.d.results ?? []);

        let nextCursor: string | undefined;
        const nextLink = salesOrdersData.__next ?? (Array.isArray(salesOrdersData.d) ? undefined : salesOrdersData.d.__next);
        if (nextLink) {
            const nextUrl = new URL(nextLink);
            const nextSkip = nextUrl.searchParams.get('$skip');
            if (nextSkip) {
                nextCursor = nextSkip;
            }
        }

        return {
            items: results.map((order) => ({
                OrderID: order.OrderID,
                ...(order.OrderNumber != null && { OrderNumber: order.OrderNumber }),
                ...(order.OrderedBy != null && { OrderedBy: order.OrderedBy }),
                ...(order.AmountDC != null && { AmountDC: order.AmountDC }),
                ...(order.Modified != null && { Modified: order.Modified }),
                ...(order.Status != null && { Status: order.Status })
            })),
            ...(nextCursor !== undefined && { NextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
