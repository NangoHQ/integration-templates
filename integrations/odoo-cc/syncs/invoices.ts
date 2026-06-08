import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InvoiceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    move_type: z.string().optional(),
    amount_total: z.number().optional(),
    state: z.string().optional(),
    write_date: z.string().optional()
});

const CheckpointSchema = z.object({
    write_date: z.string()
});

const RawRecordSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string().optional(),
    move_type: z.string().optional(),
    amount_total: z.union([z.number(), z.string()]).optional(),
    state: z.string().optional(),
    write_date: z.string().optional()
});

const sync = createSync({
    description: 'Sync Odoo invoices and bills.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        // https://www.odoo.com/documentation/master/developer/reference/external_api.html
        {
            method: 'GET',
            path: '/syncs/invoices'
        }
    ],
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        const proxyConfig: ProxyConfiguration = {
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: '/1.0/account.move',
            params: {
                domain: "[['move_type','in',['out_invoice','in_invoice']]]",
                fields: "['id','name','move_type','amount_total','state','write_date']",
                order: 'write_date asc, id asc',
                ...(checkpoint?.write_date && { write_date: checkpoint.write_date })
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
            const records = z.array(z.unknown()).parse(page);
            if (records.length === 0) {
                continue;
            }

            const invoices = [];
            for (const raw of records) {
                const parsed = RawRecordSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse invoice record: ${JSON.stringify(parsed.error.issues)}`);
                }

                const record = parsed.data;
                const amountTotal = typeof record.amount_total === 'string' ? parseFloat(record.amount_total) : record.amount_total;

                invoices.push({
                    id: String(record.id),
                    ...(record.name !== undefined && { name: record.name }),
                    ...(record.move_type !== undefined && { move_type: record.move_type }),
                    ...(amountTotal !== undefined && { amount_total: amountTotal }),
                    ...(record.state !== undefined && { state: record.state }),
                    ...(record.write_date !== undefined && { write_date: record.write_date })
                });
            }

            if (invoices.length > 0) {
                await nango.batchSave(invoices, 'Invoice');
                const lastInvoice = invoices[invoices.length - 1];
                if (lastInvoice && lastInvoice.write_date) {
                    await nango.saveCheckpoint({
                        write_date: lastInvoice.write_date
                    });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
