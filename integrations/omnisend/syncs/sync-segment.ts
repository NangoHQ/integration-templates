import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({
            archivedAt: z.string().optional(),
            conditionGroups: z
                .array(
                    z
                        .object({
                            conditions: z
                                .array(z.object({ entity: z.unknown().optional(), filters: z.unknown(), junction: z.unknown().optional() }).passthrough())
                                .optional()
                        })
                        .passthrough()
                )
                .optional(),
            createdAt: z.string().optional(),
            isStarred: z.boolean().optional(),
            name: z.string().optional(),
            segmentID: z.string().optional(),
            status: z.enum(['ready', 'building', 'archived']).optional(),
            updatedAt: z.string().optional()
        })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Segments records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/segment',
            group: 'Segments'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendSegment: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/segments',
            model: 'OmnisendSegment',
            collectionKey: 'segments',
            idField: 'segmentID',
            pagination: 'cursor'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
