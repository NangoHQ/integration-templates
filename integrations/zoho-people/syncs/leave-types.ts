import { createSync } from 'nango';
import { z } from 'zod';

const LeaveTypeSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
    type: z.string().optional(),
    isGrantBased: z.boolean().optional(),
    isDisabled: z.boolean().optional(),
    isV2: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    leavetypes: z
        .array(
            z.object({
                id: z.string(),
                name: z.string().optional(),
                color: z.string().optional(),
                type: z.string().optional(),
                isGrantBased: z.boolean().optional(),
                isDisabled: z.boolean().optional(),
                isV2: z.boolean().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync leave type definitions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LeaveType: LeaveTypeSchema
    },
    endpoints: [
        {
            path: '/syncs/leave-types',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // https://www.zoho.com/people/api/overview.html
        const response = await nango.get({
            endpoint: '/api/v2/leavetracker/leavetypes',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error('Failed to parse leavetypes response');
        }

        const leavetypes = parsed.data.leavetypes ?? [];

        await nango.trackDeletesStart('LeaveType');

        const leaveTypes = leavetypes.map((record) => ({
            id: record.id,
            ...(record.name !== undefined ? { name: record.name } : {}),
            ...(record.color !== undefined ? { color: record.color } : {}),
            ...(record.type !== undefined ? { type: record.type } : {}),
            ...(record.isGrantBased !== undefined ? { isGrantBased: record.isGrantBased } : {}),
            ...(record.isDisabled !== undefined ? { isDisabled: record.isDisabled } : {}),
            ...(record.isV2 !== undefined ? { isV2: record.isV2 } : {})
        }));

        if (leaveTypes.length > 0) {
            await nango.batchSave(leaveTypes, 'LeaveType');
        }

        await nango.trackDeletesEnd('LeaveType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
