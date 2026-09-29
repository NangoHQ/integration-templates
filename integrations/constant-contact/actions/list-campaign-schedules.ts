import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaign_activity_id: z
            .string()
            .describe(
                'The ID of the campaign activity (usually the one with role "primary_email") whose schedules to list. Example: "123e4567-e89b-12d3-a456-426614174000"'
            )
    })
    .describe('Input for listing the pending schedules of a campaign activity.');

const ScheduleSchema = z.object({
    scheduled_date: z
        .string()
        .describe(
            'The date and time, in ISO-8601 format, when Constant Contact will send the email campaign activity to contacts. Example: "2026-10-15T16:00:00.000Z"'
        )
});

const OutputSchema = z
    .object({
        schedules: z.array(ScheduleSchema).describe('The pending schedules for the campaign activity. Empty when the activity is not currently scheduled.')
    })
    .describe('Result of listing the pending schedules for a campaign activity.');

const ProviderScheduleSchema = z.object({
    scheduled_date: z.string()
});

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET of the campaign activity's pending schedules with no provider-side mutations.
 * @pitfalls: This action takes a campaign activity ID, not a campaign ID; find the activity ID (usually the one with role "primary_email") in the campaign's campaign_activities list.
 */
const action = createAction({
    description: 'List the pending schedule(s) for a campaign activity',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: `/v3/emails/activities/${encodeURIComponent(input.campaign_activity_id)}/schedules`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerSchedules = z.array(ProviderScheduleSchema).parse(response.data);

        return {
            schedules: providerSchedules.map((schedule) => ({
                scheduled_date: schedule.scheduled_date
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
