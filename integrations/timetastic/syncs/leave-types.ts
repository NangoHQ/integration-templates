import { createSync } from 'nango';
import { z } from 'zod';

const LeaveTypeSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    organisationId: z.number().int(),
    deducted: z.boolean(),
    requiresApproval: z.boolean(),
    includeMaxOff: z.boolean(),
    isPrivate: z.boolean(),
    active: z.boolean(),
    isInUse: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
    calendarVisibility: z.enum(['Busy', 'Available', 'OutOfOffice']).optional(),
    limitHours: z.number().optional(),
    limitDays: z.number().optional()
});

const ProviderLeaveTypeSchema = z.object({
    id: z.number().int(),
    name: z.string().nullable().optional(),
    organisationId: z.number().int(),
    deducted: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    includeMaxOff: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
    active: z.boolean().optional(),
    isInUse: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    calendarVisibility: z
        .union([z.literal(0), z.literal(1), z.literal(2)])
        .nullable()
        .optional(),
    limitHours: z.number().nullable().optional(),
    limitDays: z.number().nullable().optional()
});

const calendarVisibilityMap: Record<number, string> = {
    0: 'Busy',
    1: 'Available',
    2: 'OutOfOffice'
};

const sync = createSync({
    description: 'Sync leave types.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LeaveType: LeaveTypeSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /leavetypes with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. The dataset is small,
        // so full refresh with delete tracking is used.
        await nango.trackDeletesStart('LeaveType');

        // https://timetastic.co.uk/api/
        const response = await nango.get({
            endpoint: '/leavetypes',
            params: {
                includeInactive: 'true'
            },
            retries: 3
        });

        const parsed = z.array(ProviderLeaveTypeSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse leave types: ${parsed.error.message}`);
        }

        const leaveTypes = parsed.data.map((raw) => ({
            id: String(raw.id),
            ...(raw.name != null && { name: raw.name }),
            organisationId: raw.organisationId,
            ...(raw.deducted !== undefined && { deducted: raw.deducted }),
            ...(raw.requiresApproval !== undefined && { requiresApproval: raw.requiresApproval }),
            ...(raw.includeMaxOff !== undefined && { includeMaxOff: raw.includeMaxOff }),
            ...(raw.isPrivate !== undefined && { isPrivate: raw.isPrivate }),
            ...(raw.active !== undefined && { active: raw.active }),
            ...(raw.isInUse !== undefined && { isInUse: raw.isInUse }),
            ...(raw.createdAt !== undefined && { createdAt: raw.createdAt }),
            ...(raw.updatedAt !== undefined && { updatedAt: raw.updatedAt }),
            ...(raw.color != null && { color: raw.color }),
            ...(raw.icon != null && { icon: raw.icon }),
            ...(raw.calendarVisibility != null && { calendarVisibility: calendarVisibilityMap[raw.calendarVisibility] }),
            ...(raw.limitHours != null && { limitHours: raw.limitHours }),
            ...(raw.limitDays != null && { limitDays: raw.limitDays })
        }));

        if (leaveTypes.length > 0) {
            await nango.batchSave(leaveTypes, 'LeaveType');
        }

        await nango.trackDeletesEnd('LeaveType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
