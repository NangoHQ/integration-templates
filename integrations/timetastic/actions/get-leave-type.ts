import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the leave type. Example: 586853')
});

const ProviderLeaveTypeSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    organisationId: z.number(),
    deducted: z.boolean(),
    requiresApproval: z.boolean(),
    includeMaxOff: z.boolean(),
    isPrivate: z.boolean(),
    active: z.boolean(),
    isInUse: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    color: z.string().nullable(),
    icon: z.string().nullable(),
    calendarVisibility: z.number(),
    limitHours: z.number().nullable(),
    limitDays: z.number().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    organisationId: z.number(),
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
    calendarVisibility: z.enum(['Busy', 'Available', 'OutOfOffice']),
    limitHours: z.number().optional(),
    limitDays: z.number().optional()
});

function mapCalendarVisibility(value: number): 'Busy' | 'Available' | 'OutOfOffice' {
    if (value === 0) {
        return 'Busy';
    }
    if (value === 1) {
        return 'Available';
    }
    if (value === 2) {
        return 'OutOfOffice';
    }
    throw new Error(`Unexpected calendarVisibility value: ${value}`);
}

const action = createAction({
    description: 'Retrieve a single leave type.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: `/leavetypes/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Leave type not found',
                id: input.id
            });
        }

        const leaveType = ProviderLeaveTypeSchema.parse(response.data);

        return {
            id: leaveType.id,
            organisationId: leaveType.organisationId,
            deducted: leaveType.deducted,
            requiresApproval: leaveType.requiresApproval,
            includeMaxOff: leaveType.includeMaxOff,
            isPrivate: leaveType.isPrivate,
            active: leaveType.active,
            isInUse: leaveType.isInUse,
            createdAt: leaveType.createdAt,
            updatedAt: leaveType.updatedAt,
            calendarVisibility: mapCalendarVisibility(leaveType.calendarVisibility),
            ...(leaveType.name != null && { name: leaveType.name }),
            ...(leaveType.color != null && { color: leaveType.color }),
            ...(leaveType.icon != null && { icon: leaveType.icon }),
            ...(leaveType.limitHours != null && { limitHours: leaveType.limitHours }),
            ...(leaveType.limitDays != null && { limitDays: leaveType.limitDays })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
