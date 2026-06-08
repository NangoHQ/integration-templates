import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CrmLeadSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    partner_name: z.string().optional(),
    email_from: z.string().optional(),
    stage_id: z.string().optional(),
    stage_name: z.string().optional(),
    write_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const OdooString = z.union([z.string(), z.literal(false), z.null(), z.undefined()]).transform((value) => (typeof value === 'string' ? value : undefined));

const OdooMany2one = z.union([z.tuple([z.number(), z.string()]), z.literal(false), z.null(), z.undefined()]).transform((value) => {
    if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'string') {
        return { id: String(value[0]), name: value[1] };
    }
    return undefined;
});

const ProviderRecordSchema = z.object({
    id: z.number(),
    name: OdooString,
    partner_name: OdooString,
    email_from: OdooString,
    stage_id: OdooMany2one,
    write_date: OdooString
});

const sync = createSync({
    description: 'Sync Odoo CRM leads and opportunities.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/crm-leads' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CrmLead: CrmLeadSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint ? checkpoint['updated_after'] : undefined;

        const params: Record<string, string | number> = {
            fields: "['id','name','partner_name','email_from','stage_id','write_date']",
            order: 'write_date asc, id asc',
            limit: 100
        };
        if (updatedAfter) {
            params['write_date'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: '/1.0/crm.lead',
            params,
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
            const leads = page.map((raw) => {
                const record = ProviderRecordSchema.parse(raw);
                return {
                    id: String(record.id),
                    ...(record.name != null && { name: record.name }),
                    ...(record.partner_name != null && { partner_name: record.partner_name }),
                    ...(record.email_from != null && { email_from: record.email_from }),
                    ...(record.stage_id != null && { stage_id: record.stage_id.id, stage_name: record.stage_id.name }),
                    ...(record.write_date != null && { write_date: record.write_date })
                };
            });

            if (leads.length === 0) {
                continue;
            }

            await nango.batchSave(leads, 'CrmLead');

            const lastRecord = leads[leads.length - 1];
            if (lastRecord && lastRecord.write_date) {
                await nango.saveCheckpoint({ updated_after: lastRecord.write_date });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
