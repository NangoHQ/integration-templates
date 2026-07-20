import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderChangeRequestSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    priority: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    type: z.string().optional(),
    approval: z.string().optional(),
    active: z.string().optional(),
    close_code: z.string().optional(),
    close_notes: z.string().optional(),
    sys_created_on: z.string(),
    sys_updated_on: z.string()
});

const ChangeRequestSchema = z.object({
    id: z.string(),
    number: z.string(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    priority: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    type: z.string().optional(),
    approval: z.string().optional(),
    active: z.string().optional(),
    close_code: z.string().optional(),
    close_notes: z.string().optional(),
    sys_created_on: z.string(),
    sys_updated_on: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync change requests.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ChangeRequest: ChangeRequestSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/change_request
            endpoint: '/api/now/table/change_request',
            params: {
                // Inclusive boundary: records sharing the checkpoint timestamp must be re-included, or they
                // can be permanently skipped after a page/run boundary. batchSave upserts by id, so
                // re-saving the boundary record(s) is safe.
                sysparm_query: updatedAfter ? `sys_updated_on>=${updatedAfter}^ORDERBYsys_updated_on` : 'ORDERBYsys_updated_on',
                sysparm_fields:
                    'sys_id,number,short_description,description,state,priority,impact,urgency,type,approval,active,close_code,close_notes,sys_created_on,sys_updated_on'
            },
            paginate: {
                type: 'link',
                limit_name_in_request: 'sysparm_limit',
                limit: 100,
                response_path: 'result',
                link_rel_in_response_header: 'next'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderChangeRequestSchema).safeParse(batch);
            if (!parsed.success) {
                throw new Error(`Invalid provider response: ${parsed.error.message}`);
            }

            const rawRecords = parsed.data;

            const changeRequests = rawRecords.map((raw) => {
                const record = ChangeRequestSchema.safeParse({
                    id: raw.sys_id,
                    number: raw.number,
                    short_description: raw.short_description,
                    description: raw.description,
                    state: raw.state,
                    priority: raw.priority,
                    impact: raw.impact,
                    urgency: raw.urgency,
                    type: raw.type,
                    approval: raw.approval,
                    active: raw.active,
                    close_code: raw.close_code,
                    close_notes: raw.close_notes,
                    sys_created_on: raw.sys_created_on,
                    sys_updated_on: raw.sys_updated_on
                });

                if (!record.success) {
                    throw new Error(`Invalid change request record: ${record.error.message}`);
                }

                return record.data;
            });

            if (changeRequests.length === 0) {
                continue;
            }

            await nango.batchSave(changeRequests, 'ChangeRequest');

            const lastRecord = changeRequests.at(-1);
            if (lastRecord) {
                await nango.saveCheckpoint({
                    updated_after: lastRecord.sys_updated_on
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
