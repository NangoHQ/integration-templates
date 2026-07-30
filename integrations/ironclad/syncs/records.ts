import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RecordSchema = z.object({
    id: z.string(),
    ironcladId: z.string(),
    type: z.string(),
    name: z.string(),
    lastUpdated: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    attachments: z.record(z.string(), z.unknown()).optional(),
    links: z
        .array(
            z.object({
                recordId: z.string()
            })
        )
        .optional(),
    parentId: z.string().optional(),
    parentLinkType: z.string().optional(),
    childIds: z.array(z.string()).optional(),
    contractStatus: z
        .object({
            status: z.string(),
            enhancedStatus: z.string(),
            remainingDuration: z.string().optional(),
            eventDate: z.string().optional(),
            message: z.string().optional()
        })
        .optional(),
    source: z.unknown().optional(),
    amendments: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync contract records (structured metadata objects, independent of any workflow).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const startingPage = checkpoint.success ? checkpoint.data.page : 0;

        // Blocker: no confirmed incremental filter parameter for /records in this pass.
        // Resume the page/pageSize full refresh when Nango interrupts mid-run.
        let nextPage = startingPage;

        await nango.trackDeletesStart('Record');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.ironcladapp.com/reference/list-all-records
            endpoint: '/public/api/v1/records',
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

        // https://developer.ironcladapp.com/reference/list-all-records
        for await (const batch of nango.paginate(proxyConfig)) {
            const records = [];
            for (const raw of batch) {
                const parsed = RecordSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse record: ${parsed.error.message}`);
                }
                records.push(parsed.data);
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'Record');
                nextPage += 1;
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Record');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
