import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCmdbCiSchema = z
    .object({
        sys_id: z.string(),
        sys_updated_on: z.string()
    })
    .passthrough();

const CmdbCiSchema = z
    .object({
        id: z.string(),
        name: z.unknown().optional(),
        sys_class_name: z.unknown().optional(),
        sys_created_on: z.unknown().optional(),
        sys_updated_on: z.string(),
        operational_status: z.unknown().optional(),
        install_status: z.unknown().optional(),
        asset_tag: z.unknown().optional(),
        serial_number: z.unknown().optional(),
        model_id: z.unknown().optional(),
        manufacturer: z.unknown().optional(),
        location: z.unknown().optional(),
        assigned_to: z.unknown().optional(),
        company: z.unknown().optional(),
        active: z.unknown().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync CMDB configuration items from ServiceNow',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CmdbCi: CmdbCiSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const queryParts: string[] = ['ORDERBYsys_updated_on'];
        if (checkpoint && checkpoint['updated_after']) {
            queryParts.unshift(`sys_updated_on>${checkpoint['updated_after']}`);
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api
            endpoint: '/api/now/table/cmdb_ci',
            params: {
                sysparm_query: queryParts.join('^'),
                sysparm_limit: 100
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'sysparm_limit',
                limit: 100,
                response_path: 'result'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const records = page.map((item) => {
                const parsed = ProviderCmdbCiSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse CMDB CI record: ${parsed.error.message}`);
                }
                const record = parsed.data;
                const { sys_id, ...rest } = record;
                return {
                    id: sys_id,
                    ...rest
                };
            });

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'CmdbCi');
            const lastRecord = records[records.length - 1];
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
