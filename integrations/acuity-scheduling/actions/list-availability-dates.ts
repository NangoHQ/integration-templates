import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    month: z.string().describe('Month to check available dates. Example: "2026-06"'),
    appointmentTypeID: z.number().describe('Numeric ID of the appointment type to check availability for. Example: 94517100'),
    calendarID: z.number().optional().describe('Numeric ID of the calendar to check availability for.'),
    addonIDs: z.array(z.number()).optional().describe('Addon IDs to use when calculating availability.'),
    timezone: z.string().optional().describe('Timezone for availability time conversion. Example: "America/New_York"')
});

const OutputSchema = z.object({
    dates: z.array(z.string()).describe('Array of available date strings in YYYY-MM-DD format.')
});

const action = createAction({
    description: 'List dates with availability for a month and appointment type.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-availability-dates',
        group: 'Availability'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | number[]> = {
            month: input.month,
            appointmentTypeID: input.appointmentTypeID
        };

        if (input.calendarID !== undefined) {
            params['calendarID'] = input.calendarID;
        }

        if (input.addonIDs !== undefined && input.addonIDs.length > 0) {
            params['addonIDs'] = input.addonIDs;
        }

        if (input.timezone !== undefined) {
            params['timezone'] = input.timezone;
        }

        // https://developers.acuityscheduling.com/reference/get-availability-dates
        const response = await nango.get({
            endpoint: '/availability/dates',
            params,
            retries: 3
        });

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of availability date objects from the provider.'
            });
        }

        const ProviderDateSchema = z.object({
            date: z.string()
        });

        const dates: string[] = [];
        for (const item of rawData) {
            const parsed = ProviderDateSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Expected each availability item to be an object with a date string.'
                });
            }
            dates.push(parsed.data.date);
        }

        return {
            dates
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
