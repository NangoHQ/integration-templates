import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    organization_id: z.number().describe('Organization ID. Example: 775646'),
    start: z.string().describe('Start of date range in ISO8601 format. Example: 2026-07-29T00:00:00Z'),
    stop: z.string().describe('End of date range in ISO8601 format. Example: 2026-07-30T00:00:00Z')
});

const ActivitySchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        date: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        time_slot: z.string().optional(),
        starts_at: z.string().optional(),
        user_id: z.number().optional(),
        project_id: z.number().optional(),
        task_id: z.number().nullable().optional(),
        keyboard: z.number().optional(),
        mouse: z.number().optional(),
        overall: z.number().optional(),
        tracked: z.number().optional(),
        input_tracked: z.number().optional(),
        tracks_input: z.boolean().optional(),
        location_type: z.string().nullable().optional(),
        billable: z.boolean().optional(),
        paid: z.boolean().optional(),
        client_invoiced: z.boolean().optional(),
        team_invoiced: z.boolean().optional(),
        immutable: z.boolean().optional(),
        timesheet_locked: z.boolean().optional(),
        time_type: z.string().optional(),
        client: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    activities: z.array(ActivitySchema)
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_MS = 7 * MS_PER_DAY;

const action = createAction({
    description: 'List tracked-time activity records for an organization within a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const startDate = new Date(input.start);
        const stopDate = new Date(input.stop);

        if (isNaN(startDate.getTime()) || isNaN(stopDate.getTime())) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'start and stop must be valid ISO8601 date strings.'
            });
        }

        if (startDate >= stopDate) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'start must be earlier than stop.'
            });
        }

        const activities: z.infer<typeof ActivitySchema>[] = [];
        let currentStart = startDate;
        const orgId = encodeURIComponent(String(input.organization_id));

        while (currentStart < stopDate) {
            let currentStop = new Date(currentStart.getTime() + MAX_RANGE_MS);
            if (currentStop > stopDate) {
                currentStop = stopDate;
            }

            const activitiesProxyConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: `v2/organizations/${orgId}/activities`,
                params: {
                    'time_slot[start]': currentStart.toISOString(),
                    'time_slot[stop]': currentStop.toISOString()
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'page_start_id',
                    cursor_path_in_response: 'pagination.next_page_start_id',
                    response_path: 'activities',
                    limit_name_in_request: 'page_limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const activitiesPage of nango.paginate(activitiesProxyConfig)) {
                for (const raw of activitiesPage) {
                    const parsed = ActivitySchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new nango.ActionError({
                            type: 'invalid_response',
                            message: 'Failed to parse activity record from Hubstaff API.',
                            details: parsed.error.issues
                        });
                    }
                    activities.push(parsed.data);
                }
            }

            currentStart = currentStop;
        }

        return {
            activities
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
