import { createSync } from 'nango';
import { z } from 'zod';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const ProviderInvoiceSchema = z.object({
    id: z.number(),
    name: z.union([z.string(), z.literal(false)]).optional(),
    move_type: z.union([z.string(), z.literal(false)]).optional(),
    partner_id: z.union([z.tuple([z.number(), z.string()]), z.literal(false)]).optional(),
    amount_total: z.union([z.number(), z.literal(false)]).optional(),
    state: z.union([z.string(), z.literal(false)]).optional(),
    write_date: z.string()
});

const InvoiceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    move_type: z.string().optional(),
    partner_id: z.tuple([z.number(), z.string()]).optional(),
    amount_total: z.number().optional(),
    state: z.string().optional(),
    write_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.number().int().nonnegative()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

function buildDomain(checkpoint: Checkpoint): Array<unknown> {
    const domain: Array<unknown> = [['move_type', 'in', ['out_invoice', 'in_invoice']]];

    if (!checkpoint.updated_after) {
        return domain;
    }

    if ((checkpoint.last_id ?? 0) > 0) {
        domain.push('|', ['write_date', '>', checkpoint.updated_after], '&', ['write_date', '=', checkpoint.updated_after], ['id', '>', checkpoint.last_id]);
        return domain;
    }

    domain.push(['write_date', '>', checkpoint.updated_after]);
    return domain;
}

const sync = createSync({
    description: 'Sync Odoo invoices and bills',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        let checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', last_id: 0 });
        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };
        const limit = 100;

        while (true) {
            const response = await nango.post({
                // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
                endpoint: '/json/2/account.move/search_read',
                data: {
                    domain: buildDomain(checkpoint),
                    fields: ['id', 'name', 'move_type', 'partner_id', 'amount_total', 'state', 'write_date'],
                    order: 'write_date asc, id asc',
                    limit
                },
                baseUrlOverride,
                headers,
                retries: 3
            });

            let rawData = response.data;
            if (typeof rawData === 'string') {
                rawData = JSON.parse(rawData);
            }

            const page = z.array(z.unknown()).parse(rawData);
            if (page.length === 0) {
                break;
            }

            const invoices = [];
            for (const raw of page) {
                const parsed = ProviderInvoiceSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                }
                const record = parsed.data;
                invoices.push({
                    id: String(record.id),
                    ...(typeof record.name === 'string' && { name: record.name }),
                    ...(typeof record.move_type === 'string' && { move_type: record.move_type }),
                    ...(Array.isArray(record.partner_id) && { partner_id: record.partner_id }),
                    ...(typeof record.amount_total === 'number' && { amount_total: record.amount_total }),
                    ...(typeof record.state === 'string' && { state: record.state }),
                    write_date: record.write_date
                });
            }

            await nango.batchSave(invoices, 'Invoice');

            const lastRecord = invoices.at(-1);
            if (!lastRecord) {
                throw new Error('Expected at least one invoice after parsing the response page');
            }

            checkpoint = {
                updated_after: lastRecord.write_date,
                last_id: Number(lastRecord.id)
            };
            await nango.saveCheckpoint(checkpoint);

            if (page.length < limit) {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
