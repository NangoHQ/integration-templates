import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaign_activity_id: z
            .string()
            .describe(
                'The ID of the campaign activity whose pending schedule should be cancelled. Use a campaign_activity_id from the campaign\'s campaign_activities array (role "primary_email"), not the campaign ID. Example: "a1b2c3d4-1234-5678-9abc-def012345678"'
            )
    })
    .describe('Input for unscheduling a campaign activity.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the pending schedule was cancelled (the provider responded 204 No Content).')
    })
    .describe('Confirmation that the pending schedule was cancelled.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes the campaign activity's pending schedule via the provider API, cancelling a scheduled send that would otherwise go out.
 * @pitfalls: Takes a campaign activity ID, not the campaign ID; a campaign exposes multiple activity IDs (roles such as primary_email and permalink) in its campaign_activities array, so pass the ID of the activity whose schedule should be cancelled.
 */
const action = createAction({
    description: "Cancel a campaign activity's pending schedule.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: `/v3/emails/activities/${encodeURIComponent(input.campaign_activity_id)}/schedules`,
            // No idempotency key: a retry after a lost response would repeat the cancel against an already-unscheduled activity, so retries stay at 0
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
