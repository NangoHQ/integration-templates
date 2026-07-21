import { z } from 'zod';
import { createAction } from 'nango';

const LeaveTypeSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    organisationId: z.number(),
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
        .union([z.string(), z.number()])
        .optional()
        .describe(
            'Calendar visibility for this leave type. The API may return a string ("Busy", "Available", "OutOfOffice") or a numeric enum value (0, 1, 2).'
        ),
    limitHours: z.number().nullable().optional(),
    limitDays: z.number().nullable().optional()
});

const InputSchema = z.object({
    includeInactive: z.boolean().optional().describe('Set to true to also return inactive (deleted) leave types. Defaults to false (active only).')
});

const OutputSchema = z.object({
    leaveTypes: z.array(LeaveTypeSchema)
});

const action = createAction({
    description: 'List leave types for the organisation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
        const response = await nango.get({
            endpoint: '/leavetypes',
            params: {
                ...(input.includeInactive !== undefined && { includeInactive: String(input.includeInactive) })
            },
            retries: 3
        });

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of leave types from the provider.'
            });
        }

        const leaveTypes = rawData.map((item: unknown) => {
            const parsed = LeaveTypeSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Provider returned a leave type that does not match the expected schema.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return {
            leaveTypes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
