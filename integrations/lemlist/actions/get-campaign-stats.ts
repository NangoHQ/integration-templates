import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.string().describe('Unique ID of the campaign to retrieve statistics for. Example: "cam_vyzp8v33RBTfNQRvz"'),
        startDate: z.string().describe('Start of the reporting window in ISO 8601 format (date or date-time). Example: "2026-01-01"'),
        endDate: z.string().describe('End of the reporting window in ISO 8601 format (date or date-time). Example: "2026-10-01"')
    })
    .describe('Campaign and date range to retrieve aggregate statistics for');

const OutputSchema = z
    .object({
        leadTotal: z.number().describe('Total number of leads ever added to the campaign'),
        leadToLaunch: z.number().describe('Number of leads that have not been launched into the sequence yet'),
        leadReadyToSend: z.number().describe('Number of launched leads ready to receive the next step'),
        leadInProgress: z.number().describe('Number of leads currently progressing through the sequence'),
        leadCompleted: z.number().describe('Number of leads that finished the sequence'),
        sentCount: z.number().describe('Number of messages sent within the date range'),
        deliveredCount: z.number().describe('Number of messages delivered within the date range'),
        openedCount: z.number().describe('Number of messages opened within the date range'),
        clickedCount: z.number().describe('Number of messages with at least one link click within the date range'),
        repliedCount: z.number().describe('Number of messages that received a reply within the date range'),
        interestedCount: z.number().describe('Number of leads marked as interested within the date range')
    })
    .describe('Aggregate lead-funnel and engagement counters for the campaign over the requested date range');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of campaign statistics and mutates nothing on the provider.
 * @pitfalls: Engagement counters only cover activity within the startDate-endDate window. A campaign without a configured sender or sequence steps reports zeros for all send and engagement counters even when leads are enrolled.
 */
const action = createAction({
    description: 'Get aggregate send/open/click/reply/bounce counts for a campaign over a date range',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.lemlist.com/api-reference/endpoints/campaigns/get-campaign-stats
        const response = await nango.get({
            endpoint: `/api/campaigns/${encodeURIComponent(input.campaignId)}/stats`,
            params: {
                startDate: input.startDate,
                endDate: input.endDate
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
