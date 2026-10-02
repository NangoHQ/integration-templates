import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.number().int().positive().describe('ID of the draft email campaign to schedule. Example: 42'),
        scheduledAt: z.iso
            .datetime({ offset: true })
            .describe('ISO 8601 date-time, including timezone, at which the campaign should send. Example: "2026-12-31T10:00:00.000+01:00"')
    })
    .describe('Campaign to schedule and the future date-time it should send at.');

const ProviderCampaignSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    scheduledAt: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the scheduled campaign. Example: 42'),
        name: z.string().describe('Name of the campaign.'),
        status: z.string().describe('Campaign status after scheduling. Example: "queued"'),
        scheduledAt: z
            .string()
            .optional()
            .describe('Scheduled send date-time as stored by Brevo, normalized to the account timezone. Example: "2026-12-31T10:00:00.000+01:00"')
    })
    .describe('Confirmation of the schedule, read back from the campaign after the update was applied.');

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates the campaign by setting scheduledAt via PUT (write), and scheduling is irreversible once queued: the campaign cannot be unscheduled, returned to draft, or deleted and will send real email at the given time (destructive).
 * @pitfalls: Scheduling is irreversible: once queued, the campaign will send real email at the given time and cannot be unscheduled, returned to draft, or deleted. Only draft or already-queued campaigns can be (re)scheduled. The returned scheduledAt is normalized to the account's timezone offset, which may differ from the offset passed in. If the campaign was created with send-at-best-time enabled, Brevo ignores the time portion and sends on the given date only.
 */
const action = createAction({
    description: 'Schedule a draft email campaign to send at a future date/time.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const campaignId = encodeURIComponent(String(input.campaignId));

        const updateConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/updateemailcampaign
            endpoint: `/emailCampaigns/${campaignId}`,
            data: {
                scheduledAt: input.scheduledAt
            },
            // PUT is idempotent here: re-applying the same scheduledAt yields the same campaign state.
            retries: 3
        };
        await nango.put(updateConfig);

        const getConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/getemailcampaign
            endpoint: `/emailCampaigns/${campaignId}`,
            params: {
                excludeHtmlContent: 'true'
            },
            retries: 3
        };
        const response = await nango.get(getConfig);

        const campaign = ProviderCampaignSchema.parse(response.data);

        return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            ...(campaign.scheduledAt !== undefined && { scheduledAt: campaign.scheduledAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
