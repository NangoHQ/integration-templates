import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SaleOrderSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    partner_id: z.string().optional(),
    partner_name: z.string().optional(),
    amount_total: z.number().optional(),
    state: z.string().optional(),
    write_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const OdooSaleOrderSchema = z.object({
    id: z.number().int(),
    name: z.string().optional(),
    partner_id: z.union([z.array(z.unknown()), z.boolean(), z.null()]).optional(),
    amount_total: z.number().optional(),
    state: z.string().optional(),
    write_date: z.string().optional()
});

const sync = createSync({
    description: 'Sync Odoo sale orders',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SaleOrder: SaleOrderSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/sale-orders'
        }
    ],

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        if (checkpointRaw != null && typeof checkpointRaw.updated_after !== 'string') {
            throw new Error('Invalid checkpoint: updated_after must be a string');
        }
        const checkpoint = { updated_after: checkpointRaw?.updated_after ?? '' };

        const proxyConfig: ProxyConfiguration = {
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: '/1.0/sale.order',
            params: {
                fields: "['id','name','partner_id','amount_total','state','write_date']",
                order: 'write_date asc,id asc',
                ...(checkpoint.updated_after && { write_date: checkpoint.updated_after })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'records'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawRecords = z.array(z.unknown()).parse(page);
            const saleOrders: Array<z.infer<typeof SaleOrderSchema>> = [];

            for (const raw of rawRecords) {
                const parsed = OdooSaleOrderSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse Odoo sale order: ${parsed.error.message}`);
                }

                const record = parsed.data;
                let partnerId: string | undefined;
                let partnerName: string | undefined;

                const partnerIdValue = record.partner_id;
                if (
                    Array.isArray(partnerIdValue) &&
                    partnerIdValue.length >= 2 &&
                    typeof partnerIdValue[0] === 'number' &&
                    typeof partnerIdValue[1] === 'string'
                ) {
                    partnerId = String(partnerIdValue[0]);
                    partnerName = partnerIdValue[1];
                }

                saleOrders.push({
                    id: String(record.id),
                    ...(record.name != null && { name: record.name }),
                    ...(partnerId != null && { partner_id: partnerId }),
                    ...(partnerName != null && { partner_name: partnerName }),
                    ...(record.amount_total != null && { amount_total: record.amount_total }),
                    ...(record.state != null && { state: record.state }),
                    ...(record.write_date != null && { write_date: record.write_date })
                });
            }

            if (saleOrders.length === 0) {
                continue;
            }

            await nango.batchSave(saleOrders, 'SaleOrder');

            const lastRecord = saleOrders[saleOrders.length - 1];
            if (lastRecord && lastRecord.write_date) {
                await nango.saveCheckpoint({
                    updated_after: lastRecord.write_date
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
