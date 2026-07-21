import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Name of the leave type. Example: "Conference"'),
    deducted: z.boolean().optional().describe('Whether this leave type counts against allowance.'),
    requiresApproval: z.boolean().optional().describe('Whether bookings require approval.'),
    includeMaxOff: z.boolean().optional().describe('Whether this type is included in max-off calculations.'),
    isPrivate: z.boolean().optional().describe('Whether this type is private.'),
    color: z.string().optional().describe('Hex color code. Valid values available from list-leave-type-colors. Example: "#FF5733"'),
    icon: z.string().optional().describe('Icon name. Valid values available from list-leave-type-icons. Example: "plane"'),
    calendarVisibility: z.enum(['Busy', 'Available', 'OutOfOffice']).optional().describe('Calendar visibility setting.'),
    limitHours: z.number().optional().describe('Hourly booking limit.'),
    limitDays: z.number().optional().describe('Daily booking limit.')
});

const OutputSchema = z.object({
    id: z.number().int().positive().describe('The newly created leave type ID.')
});

const action = createAction({
    description: 'Create a new leave type. Admin only.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
        const response = await nango.post({
            endpoint: '/leavetypes',
            data: {
                name: input.name,
                ...(input.deducted !== undefined && { deducted: input.deducted }),
                ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
                ...(input.includeMaxOff !== undefined && { includeMaxOff: input.includeMaxOff }),
                ...(input.isPrivate !== undefined && { isPrivate: input.isPrivate }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.icon !== undefined && { icon: input.icon }),
                ...(input.calendarVisibility !== undefined && { calendarVisibility: input.calendarVisibility }),
                ...(input.limitHours !== undefined && { limitHours: input.limitHours }),
                ...(input.limitDays !== undefined && { limitDays: input.limitDays })
            },
            retries: 1
        });

        const id = z.number().int().positive().parse(response.data);

        return { id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
