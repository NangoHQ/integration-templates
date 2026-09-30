import { createSync } from 'nango';
import type { SapSuccessDepartment } from '../types.js';
import { toGroup } from '../mappers/to-group.js';

import type { ProxyConfiguration } from 'nango';
import { Group } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string(),
    resume_offset: z.number().int().nonnegative()
});

const StoredCheckpointSchema = z.object({
    updated_after: z.string().optional(),
    resume_offset: z.number().int().nonnegative().optional()
});

const sync = createSync({
    description: 'Fetches a list of organizational groups from sap success factors',
    version: '2.2.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/groups',
            group: 'Groups'
        }
    ],

    models: {
        Group: Group
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = StoredCheckpointSchema.parse(rawCheckpoint ?? {});
        const checkpointUpdatedAfter = checkpoint.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();
        const resumeOffset = checkpoint.resume_offset ?? 0;

        let nextOffset: number | undefined = resumeOffset;

        const config: ProxyConfiguration = {
            // https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/fodepartment
            endpoint: '/odata/v2/FODepartment',
            params: {
                $format: 'json',
                ...(checkpointUpdatedAfter && {
                    $filter: `lastModifiedDateTime ge datetime'${checkpointUpdatedAfter.toISOString()}'`
                })
            },
            paginate: {
                type: 'offset',
                offset_calculation_method: 'by-response-size',
                offset_name_in_request: '$skip',
                offset_start_value: resumeOffset,
                limit: 100,
                limit_name_in_request: '$top',
                response_path: 'd.results',
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 10
        };

        // Checkpoint after every batch so a run interrupted mid-pagination resumes from the last
        // saved page offset instead of restarting, while `updated_after` only advances to this
        // run's start time once the full dataset has been fetched (see final saveCheckpoint below).
        for await (const records of nango.paginate<SapSuccessDepartment>(config)) {
            const mappedRecords = records.map(toGroup);
            await nango.batchSave(mappedRecords, 'Group');

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ updated_after: checkpoint.updated_after ?? '', resume_offset: nextOffset });
            }
        }
        await nango.saveCheckpoint({ updated_after: runStartedAt, resume_offset: 0 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
