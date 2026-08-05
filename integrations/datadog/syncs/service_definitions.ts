import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ServiceDefinitionSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    page_number: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync Service Catalog service definitions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ServiceDefinition: ServiceDefinitionSchema
    },

    exec: async (nango) => {
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        let pageNumber = checkpoint?.page_number ?? 0;

        // Full refresh: this endpoint paginates, so we can resume by page number,
        // but it still has no changed-since filter or deleted-record endpoint.
        await nango.trackDeletesStart('ServiceDefinition');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/service-definition/#get-all-service-definitions
            endpoint: 'v2/services/definitions',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page[number]',
                offset_start_value: pageNumber,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page[size]',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const definitions = page.map((item) => {
                const record = ServiceDefinitionSchema.parse(item);
                return {
                    id: record.id,
                    ...(record.type !== undefined && { type: record.type }),
                    ...(record.attributes !== undefined && { attributes: record.attributes })
                };
            });

            if (definitions.length > 0) {
                await nango.batchSave(definitions, 'ServiceDefinition');
                pageNumber += 1;
                await nango.saveCheckpoint({ page_number: pageNumber });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ServiceDefinition');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
