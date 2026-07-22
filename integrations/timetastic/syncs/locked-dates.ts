import { createSync } from 'nango';
import { z } from 'zod';

const LockedDateSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    createdById: z.number().int(),
    reason: z.string().optional(),
    startTime: z.string(),
    endTime: z.string(),
    organisationId: z.number().int(),
    recordId: z.number().int(),
    recordType: z.enum(['Organisation', 'Department', 'User'])
});

const ProviderLockedDateSchema = z.object({
    id: z.number().int(),
    createdAt: z.string(),
    createdById: z.number().int(),
    reason: z.string().nullable().optional(),
    startTime: z.string(),
    endTime: z.string(),
    organisationId: z.number().int(),
    recordId: z.number().int(),
    recordType: z.union([z.enum(['Organisation', 'Department', 'User']), z.literal(0), z.literal(1), z.literal(2)]).transform((v) => {
        if (typeof v === 'string') {
            return v;
        }
        if (v === 0) {
            return 'Organisation';
        }
        if (v === 1) {
            return 'Department';
        }
        if (v === 2) {
            return 'User';
        }
        throw new Error(`Unexpected recordType integer: ${v}`);
    })
});

const sync = createSync({
    description: 'Sync locked date periods.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LockedDate: LockedDateSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /lockeddates as a complete flat array
        // with no changed-since filter, no pagination, no cursor, and no deleted-record endpoint.
        await nango.trackDeletesStart('LockedDate');

        const response = await nango.get({
            // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
            endpoint: '/lockeddates',
            retries: 3
        });

        const parsed = z.array(ProviderLockedDateSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse locked dates: ${parsed.error.message}`);
        }

        const records = parsed.data.map((item) => ({
            id: String(item.id),
            createdAt: item.createdAt,
            createdById: item.createdById,
            ...(item.reason != null && { reason: item.reason }),
            startTime: item.startTime,
            endTime: item.endTime,
            organisationId: item.organisationId,
            recordId: item.recordId,
            recordType: item.recordType
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'LockedDate');
        }

        await nango.trackDeletesEnd('LockedDate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
