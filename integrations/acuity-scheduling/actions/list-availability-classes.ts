import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    month: z.string().optional().describe('Month to check available classes (e.g., 2026-06).'),
    appointmentTypeID: z.number().optional().describe('Appointment type ID to filter by.'),
    calendarID: z.number().optional().describe('Calendar ID to filter by.'),
    timezone: z.string().optional().describe('Timezone for availability time conversion (e.g., America/New_York).'),
    minDate: z.string().optional().describe('Earliest date to return classes for.'),
    maxDate: z.string().optional().describe('Latest date to return classes for.'),
    includeUnavailable: z.boolean().optional().describe('Include classes that are no longer available.'),
    includePrivate: z.boolean().optional().describe('Include classes marked as private.')
});

const ProviderClassSchema = z.object({
    id: z.number(),
    appointmentTypeID: z.number(),
    calendarID: z.number(),
    name: z.string(),
    time: z.string(),
    calendar: z.string(),
    duration: z.number(),
    isSeries: z.boolean(),
    slots: z.number(),
    slotsAvailable: z.number()
});

const OutputSchema = z.object({
    items: z.array(ProviderClassSchema)
});

const action = createAction({
    description: 'List available class/group appointment sessions.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-availability-classes',
        group: 'Availability'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/get-availability-classes
            endpoint: '/availability/classes',
            params: {
                ...(input.month !== undefined && { month: input.month }),
                ...(input.appointmentTypeID !== undefined && { appointmentTypeID: String(input.appointmentTypeID) }),
                ...(input.calendarID !== undefined && { calendarID: String(input.calendarID) }),
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                ...(input.minDate !== undefined && { minDate: input.minDate }),
                ...(input.maxDate !== undefined && { maxDate: input.maxDate }),
                ...(input.includeUnavailable !== undefined && { includeUnavailable: String(input.includeUnavailable) }),
                ...(input.includePrivate !== undefined && { includePrivate: String(input.includePrivate) })
            },
            retries: 3
        });

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array from the provider but received something else.'
            });
        }

        const items = rawData.map((item: unknown) => {
            const parsed = ProviderClassSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Provider returned an invalid class object.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
