import { z } from 'zod';
import { createAction } from 'nango';

const SalesOrderLineInputSchema = z.object({
    Item: z.string().describe('Item GUID. Example: "61facaed-0389-4183-bf67-ac1c179e1050"'),
    Quantity: z.number().describe('Quantity. Example: 1'),
    NetPrice: z.number().describe('Net price. Example: 100.00')
});

const InputSchema = z.object({
    OrderedBy: z.string().describe('Customer account GUID. Example: "a58c29d9-ef92-40f1-b817-31b36990898c"'),
    SalesOrderLines: z.array(SalesOrderLineInputSchema).describe('Sales order lines'),
    OrderDate: z.string().optional().describe('Order date. Defaults to today if omitted. Example: "2024-05-30"')
});

const MeSchema = z
    .object({
        d: z
            .object({
                results: z.array(z.record(z.string(), z.unknown())).optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const PostResponseSchema = z
    .object({
        d: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const SalesOrderLineSchema = z
    .object({
        Item: z.string().optional(),
        Quantity: z.number().optional(),
        NetPrice: z.number().optional()
    })
    .passthrough();

const SalesOrderSchema = z
    .object({
        d: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const SalesOrderLinesResponseSchema = z
    .object({
        d: z
            .object({
                results: z.array(z.record(z.string(), z.unknown())).optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    OrderID: z.string().optional(),
    OrderedBy: z.string().optional(),
    OrderDate: z.string().optional(),
    SalesOrderLines: z.array(SalesOrderLineSchema).optional()
});

const action = createAction({
    endpoint: {
        path: '/actions/create-sales-order',
        method: 'POST'
    },
    description: 'Create a new sales order',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sales orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://start.exactonline.nl/docs/HlpRestAPIResources.aspx?SourceAction=10
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeSchema.parse(meResponse.data);
        const meResults = meData['d']?.['results'];
        const meEntry = meResults && meResults.length > 0 ? meResults[0] : undefined;
        const currentDivision =
            meEntry && typeof meEntry['CurrentDivision'] === 'number'
                ? meEntry['CurrentDivision']
                : meEntry && typeof meEntry['CurrentDivision'] === 'string'
                  ? Number(meEntry['CurrentDivision'])
                  : undefined;

        if (currentDivision === undefined || Number.isNaN(currentDivision)) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Unable to determine current division from Me endpoint'
            });
        }

        const orderDate = input.OrderDate ?? new Date().toISOString().split('T')[0];

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SalesOrderSalesOrders
        const postResponse = await nango.post({
            endpoint: `/api/v1/${encodeURIComponent(currentDivision.toString())}/salesorder/SalesOrders`,
            data: {
                OrderedBy: input.OrderedBy,
                OrderDate: orderDate,
                SalesOrderLines: input.SalesOrderLines.map((line) => ({
                    Item: line.Item,
                    Quantity: line.Quantity,
                    NetPrice: line.NetPrice
                }))
            },
            retries: 10
        });

        const postData = PostResponseSchema.parse(postResponse.data);
        const postBody = postData['d'] ?? {};
        const metadataSchema = z
            .object({
                uri: z.string().optional()
            })
            .passthrough();
        const metadata = postBody['__metadata'] && typeof postBody['__metadata'] === 'object' ? metadataSchema.parse(postBody['__metadata']) : undefined;
        const uri = metadata?.uri;

        if (!uri) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Sales order creation failed: no __metadata.uri in response'
            });
        }

        const orderIdMatch = uri.match(/SalesOrders\(guid'([^']+)'\)/);
        const orderId = orderIdMatch?.[1];

        if (!orderId) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Could not extract OrderID from creation response'
            });
        }

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SalesOrderSalesOrders
        const getResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(currentDivision.toString())}/salesorder/SalesOrders(guid'${encodeURIComponent(orderId)}')`,
            retries: 3
        });

        const order = SalesOrderSchema.parse(getResponse.data);
        const orderBody = order['d'] ?? {};

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SalesOrderSalesOrderLines
        const linesResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(currentDivision.toString())}/salesorder/SalesOrderLines`,
            params: {
                $filter: `OrderID eq guid'${encodeURIComponent(orderId)}'`
            },
            retries: 3
        });

        const linesData = SalesOrderLinesResponseSchema.parse(linesResponse.data);
        const linesResults = linesData['d']?.['results'];
        const lines: Array<z.infer<typeof SalesOrderLineSchema>> =
            linesResults && Array.isArray(linesResults) ? linesResults.map((line: unknown) => SalesOrderLineSchema.parse(line)) : [];

        return {
            OrderID: typeof orderBody['OrderID'] === 'string' ? orderBody['OrderID'] : undefined,
            OrderedBy: typeof orderBody['OrderedBy'] === 'string' ? orderBody['OrderedBy'] : undefined,
            OrderDate: typeof orderBody['OrderDate'] === 'string' ? orderBody['OrderDate'] : undefined,
            ...(lines.length > 0 && { SalesOrderLines: lines })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
