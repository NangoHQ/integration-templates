import { z } from 'zod';
import { createAction } from 'nango';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const InputSchema = z.object({
    id: z.number().int().positive().describe('Leave type ID. Example: 586883'),
    name: z.string().min(1).describe('Name of the leave type. Required by the provider on every update. Example: "Updated Leave Type"'),
    deducted: z.boolean().optional().describe('Whether this leave type deducts from allowance.'),
    requiresApproval: z.boolean().optional().describe('Whether leave requests of this type require approval.'),
    includeMaxOff: z.boolean().optional().describe('Whether this leave type counts towards the maximum off limit.'),
    isPrivate: z.boolean().optional().describe('Whether this leave type is private.'),
    color: z.string().optional().describe('Color for the leave type in the calendar.'),
    icon: z.string().optional().describe('Icon for the leave type.'),
    calendarVisibility: z.enum(['Busy', 'Available', 'OutOfOffice']).optional().describe('Calendar visibility setting.'),
    limitHours: z.number().optional().describe('Hourly limit for this leave type.'),
    limitDays: z.number().optional().describe('Daily limit for this leave type.')
});

const OutputSchema = z.object({
    id: z.number().describe('The updated leave type ID.')
});

const action = createAction({
    description: 'Update an existing leave type. Admin only.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            name: input.name
        };

        if (input.deducted !== undefined) {
            body['deducted'] = input.deducted;
        }
        if (input.requiresApproval !== undefined) {
            body['requiresApproval'] = input.requiresApproval;
        }
        if (input.includeMaxOff !== undefined) {
            body['includeMaxOff'] = input.includeMaxOff;
        }
        if (input.isPrivate !== undefined) {
            body['isPrivate'] = input.isPrivate;
        }
        if (input.color !== undefined) {
            body['color'] = input.color;
        }
        if (input.icon !== undefined) {
            body['icon'] = input.icon;
        }
        if (input.calendarVisibility !== undefined) {
            body['calendarVisibility'] = input.calendarVisibility;
        }
        if (input.limitHours !== undefined) {
            body['limitHours'] = input.limitHours;
        }
        if (input.limitDays !== undefined) {
            body['limitDays'] = input.limitDays;
        }

        // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
        // PUT /leavetypes/{id} returns 200 with an empty body on success and no ID;
        // failures (e.g. invalid color, permission denied) return 400 with { errorStatus, errorMessage }.
        try {
            await nango.put({
                endpoint: `/leavetypes/${encodeURIComponent(input.id)}`,
                data: body,
                retries: 3
            });
        } catch (err: unknown) {
            const data = isRecord(err) && isRecord(err['response']) ? err['response']['data'] : undefined;
            const errorMessage = isRecord(data) && typeof data['errorMessage'] === 'string' ? data['errorMessage'] : undefined;
            throw new nango.ActionError({
                type: 'update_failed',
                message: errorMessage ?? 'Failed to update leave type',
                id: input.id
            });
        }

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
