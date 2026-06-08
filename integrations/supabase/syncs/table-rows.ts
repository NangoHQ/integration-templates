import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TableRowSchema = z
    .object({
        id: z.string(),
        updated_at: z.string().optional()
    })
    .passthrough();

const MetadataSchema = z.object({
    table: z.string().describe('PostgREST table name to sync'),
    select: z.string().optional().describe('Columns to select'),
    order: z.string().optional().describe('Order clause, e.g. id.asc'),
    filter: z.record(z.string(), z.string()).optional().describe('Additional PostgREST filters'),
    checkpoint_column: z.string().optional().describe('Column to checkpoint on'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size')
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.string()
});

const ConnectionConfigSchema = z
    .object({
        projectUrl: z.string().optional()
    })
    .passthrough();

const buildOrder = (checkpointColumn: 'updated_at' | 'id', requestedOrder?: string): string => {
    const requiredOrder = checkpointColumn === 'updated_at' ? ['updated_at.asc', 'id.asc'] : ['id.asc'];

    if (!requestedOrder) {
        return requiredOrder.join(',');
    }

    const requiredColumns = new Set(requiredOrder.map((segment) => segment.split('.')[0] ?? segment));
    const extraOrder = requestedOrder
        .split(',')
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0)
        .filter((segment) => {
            const column = segment.split('.')[0] ?? segment;
            return !requiredColumns.has(column);
        });

    return [...requiredOrder, ...extraOrder].join(',');
};

const sync = createSync({
    description: 'Sync rows from a configured Supabase table.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        TableRow: TableRowSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/table-rows'
        }
    ],

    exec: async (nango) => {
        const metadataResult = await nango.getMetadata();
        const metadata = MetadataSchema.parse(metadataResult);

        const checkpointResult = await nango.getCheckpoint();
        const checkpoint = checkpointResult ? CheckpointSchema.parse(checkpointResult) : { updated_after: '', last_id: '' };

        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        const projectUrl = connectionConfig.success ? connectionConfig.data.projectUrl : undefined;
        const baseUrlOverride = projectUrl?.startsWith('http') ? projectUrl : undefined;

        const table = metadata.table;
        const checkpointColumn = metadata.checkpoint_column ?? 'id';
        if (checkpointColumn !== 'updated_at' && checkpointColumn !== 'id') {
            throw new Error('checkpoint_column must be updated_at or id');
        }
        const limit = metadata.limit ?? 100;

        const order = buildOrder(checkpointColumn, metadata.order);

        const params: Record<string, string | number> = {};

        if (metadata.filter) {
            for (const [key, value] of Object.entries(metadata.filter)) {
                params[key] = value;
            }
        }

        params['limit'] = limit;
        params['offset'] = 0;
        params['order'] = order;

        if (metadata.select) {
            params['select'] = metadata.select;
        }

        if (checkpointColumn === 'updated_at' && checkpoint.updated_after) {
            if (checkpoint.last_id) {
                params['or'] = `(updated_at.gt.${checkpoint.updated_after},and(updated_at.eq.${checkpoint.updated_after},id.gt.${checkpoint.last_id}))`;
            } else {
                params['updated_at'] = `gte.${checkpoint.updated_after}`;
            }
        } else if (checkpointColumn === 'id' && checkpoint.last_id) {
            params['id'] = `gt.${checkpoint.last_id}`;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://supabase.com/docs/reference/api
            endpoint: `/rest/v1/${encodeURIComponent(table)}`,
            baseUrlOverride,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                limit_name_in_request: 'limit',
                limit
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected array response from PostgREST');
            }

            const rows: Array<z.infer<typeof TableRowSchema>> = [];
            for (const item of page) {
                const parsed = TableRowSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid row from PostgREST: ${parsed.error.message}`);
                }

                if (checkpointColumn === 'updated_at' && !parsed.data.updated_at) {
                    throw new Error('Rows must include updated_at when checkpoint_column is updated_at');
                }

                rows.push(parsed.data);
            }

            if (rows.length === 0) {
                continue;
            }

            await nango.batchSave(rows, 'TableRow');

            const lastRow = rows[rows.length - 1];
            if (lastRow === undefined) {
                throw new Error('Expected last row to exist after length check');
            }

            if (checkpointColumn === 'updated_at') {
                const updatedAfter = lastRow.updated_at;
                if (!updatedAfter) {
                    throw new Error('Rows must include updated_at when checkpoint_column is updated_at');
                }

                await nango.saveCheckpoint({ updated_after: updatedAfter, last_id: lastRow.id });
            } else {
                await nango.saveCheckpoint({ updated_after: checkpoint.updated_after, last_id: lastRow.id });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
