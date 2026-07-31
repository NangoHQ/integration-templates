import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PropertyValueSchema = z.object({
    type: z.string(),
    value: z.unknown()
});

const ProviderEntitySchema = z
    .object({
        id: z.string(),
        status: z.string(),
        ironcladId: z.string(),
        name: z.string(),
        lastUpdated: z.string(),
        properties: z.record(z.string(), PropertyValueSchema).optional(),
        namedTypeIds: z.array(z.string()).optional()
    })
    .passthrough();

const EntitySchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string().optional(),
    ironcladId: z.string().optional(),
    lastUpdated: z.string(),
    properties: z.record(z.string(), PropertyValueSchema).optional(),
    namedTypeIds: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync entities (counterparty companies, customers, vendors, partners, etc.).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Entity: EntitySchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const startingPage = checkpoint.success ? checkpoint.data.page : 0;

        // Blocker: provider only exposes /public/api/v1/entities with page/pageSize
        // pagination and no confirmed incremental-filter query parameter in this pass.
        // Resume the full refresh from the saved page when Nango interrupts mid-run.
        await nango.trackDeletesStart('Entity');
        let nextPage = startingPage;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.ironcladapp.com/
            endpoint: '/public/api/v1/entities',
            params: {
                sortField: 'lastUpdated',
                sortDirection: 'ASC'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: startingPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pageSize',
                limit: 100,
                response_path: 'list'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const entities = page.map((entity: unknown) => {
                const parsed = ProviderEntitySchema.parse(entity);
                return {
                    id: parsed.id,
                    name: parsed.name,
                    status: parsed.status,
                    ironcladId: parsed.ironcladId,
                    lastUpdated: parsed.lastUpdated,
                    properties: parsed.properties,
                    namedTypeIds: parsed.namedTypeIds
                };
            });

            if (entities.length > 0) {
                await nango.batchSave(entities, 'Entity');
                nextPage += 1;
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Entity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
