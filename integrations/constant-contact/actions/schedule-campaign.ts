import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        campaign_activity_id: z
            .string()
            .describe(
                'ID of the campaign activity to schedule (the activity with role "primary_email" on the campaign). Example: "2979c38c-221b-4a03-a3b2-c52310f60f35"'
            ),
        scheduled_date: z
            .string()
            .describe('ISO 8601 date-time when Constant Contact should send the campaign. Must be in the future. Example: "2026-10-15T14:00:00.000Z"')
    })
    .describe('Input for scheduling a campaign activity.');

const ScheduleSchema = z.object({
    scheduled_date: z.string()
});

const OutputSchema = z
    .object({
        scheduled_date: z.string().describe('Confirmed send date-time for the campaign activity, as returned by Constant Contact.')
    })
    .describe('Confirmation that the campaign activity was scheduled.');

/**
 * @tags: [write]
 * @tagReason: Schedules a campaign activity to send, which mutates provider state; nothing is read and no data is deleted.
 * @pitfalls: The campaign activity must already have an audience (contact_list_ids) set on it, or the request fails with a 400 error. scheduled_date must be in the future. An already-scheduled activity must be unscheduled before it can be scheduled again.
 */
const action = createAction({
    description: 'Schedule a campaign activity to send at a future date/time.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html
        const response = await nango.post({
            endpoint: `/v3/emails/activities/${encodeURIComponent(input.campaign_activity_id)}/schedules`,
            data: {
                scheduled_date: input.scheduled_date
            },
            // Scheduling queues a real email send and Constant Contact offers no idempotency key, so retrying after a lost response could duplicate or ambiguously reschedule the send.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = z.array(ScheduleSchema).safeParse(response.data);
        const schedule = parsed.success ? parsed.data[0] : undefined;
        if (!schedule) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Constant Contact returned an unexpected response when scheduling the campaign activity.',
                campaign_activity_id: input.campaign_activity_id
            });
        }

        return {
            scheduled_date: schedule.scheduled_date
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
