import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSalesOrderSchema = z.object({
    dataAreaId: z.string(),
    SalesOrderNumber: z.string(),
    OrderingCustomerAccountNumber: z.string().nullish(),
    OrderCreationDateTime: z.string().nullish(),
    SalesOrderStatus: z.string().nullish(),
    CurrencyCode: z.string().nullish(),
    SalesOrderName: z.string().nullish(),
    RequestedReceiptDate: z.string().nullish()
});

const SalesOrderSchema = z.object({
    id: z.string(),
    data_area_id: z.string(),
    sales_order_number: z.string(),
    ordering_customer_account_number: z.string().optional(),
    order_creation_date_time: z.string().optional(),
    sales_order_status: z.string().optional(),
    currency_code: z.string().optional(),
    sales_order_name: z.string().optional(),
    requested_receipt_date: z.string().optional()
});

type SalesOrder = z.infer<typeof SalesOrderSchema>;

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync sales order headers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SalesOrder: SalesOrderSchema
    },

    exec: async (nango) => {
        // Blocker: SalesOrderHeadersV2 does not expose a filterable last-modified
        // timestamp in this environment, so we perform a full refresh with delete
        // tracking. OrderCreationDateTime is a creation timestamp, not a modification
        // timestamp, so it cannot reliably drive an incremental sync. Persist the
        // current $skip offset so an interrupted crawl can resume.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesOrderHeadersV2',
            params: {
                $orderby: 'dataAreaId asc,SalesOrderNumber asc',
                'cross-company': 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = z.array(z.unknown()).parse(page);

            const salesOrders: SalesOrder[] = [];
            for (const raw of rawItems) {
                const parsed = ProviderSalesOrderSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse SalesOrderHeadersV2 record: ${parsed.error.message}`);
                }

                const record = parsed.data;
                salesOrders.push({
                    id: `${record.dataAreaId}|${record.SalesOrderNumber}`,
                    data_area_id: record.dataAreaId,
                    sales_order_number: record.SalesOrderNumber,
                    ...(record.OrderingCustomerAccountNumber != null && { ordering_customer_account_number: record.OrderingCustomerAccountNumber }),
                    ...(record.OrderCreationDateTime != null && { order_creation_date_time: record.OrderCreationDateTime }),
                    ...(record.SalesOrderStatus != null && { sales_order_status: record.SalesOrderStatus }),
                    ...(record.CurrencyCode != null && { currency_code: record.CurrencyCode }),
                    ...(record.SalesOrderName != null && { sales_order_name: record.SalesOrderName }),
                    ...(record.RequestedReceiptDate != null && { requested_receipt_date: record.RequestedReceiptDate })
                });
            }

            if (!trackingStarted && salesOrders.length > 0) {
                await nango.trackDeletesStart('SalesOrder');
                trackingStarted = true;
            }

            if (salesOrders.length > 0) {
                await nango.batchSave(salesOrders, 'SalesOrder');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('SalesOrder');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
