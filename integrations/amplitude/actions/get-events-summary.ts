import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required.');

const EventSummarySchema = z.object({
    value: z.string().describe('Raw event name.'),
    display: z.string().optional().describe('Display name of the event.'),
    totals: z.number().optional().describe('Total number of times the event happened this week.'),
    uniques: z.number().optional().describe('Number of unique users who triggered the event this week.'),
    pct_dau: z.number().optional().describe('Percentage of daily active users who triggered the event this week.'),
    non_active: z.boolean().optional().describe('Whether the event is marked inactive.'),
    deleted: z.boolean().optional().describe('Whether the event is deleted.'),
    hidden: z.boolean().optional().describe('Whether the event is hidden from analytics charts.'),
    flow_hidden: z.boolean().optional().describe('Whether the event is hidden from Pathfinder or Pathfinder Users.')
});

const OutputSchema = z
    .object({
        events: z.array(EventSummarySchema).describe('List of tracked events for the current week.')
    })
    .describe("Summary of current week's tracked events with totals, uniques, and %DAU.");

const ProviderResponseSchema = z.object({
    data: z.array(
        z
            .object({
                non_active: z.boolean().optional(),
                value: z.string(),
                totals: z.number().optional(),
                uniques: z.number().optional(),
                pct_dau: z.number().optional(),
                deleted: z.boolean().optional(),
                flow_hidden: z.boolean().optional(),
                hidden: z.boolean().optional(),
                display: z.string().optional()
            })
            .passthrough()
    )
});

/**
 * @tags: [read]
 * @tagReason: Reads the current week's tracked events from the Amplitude Dashboard REST API.
 * @pitfalls: Hidden events are excluded from results, and the endpoint only returns the current week with no date range parameters.
 */
const action = createAction({
    description: "Get the current week's tracked events with totals, uniques, and %DAU.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'];
        const baseUrlOverride = hostname === 'analytics.eu.amplitude.com' ? 'https://analytics.eu.amplitude.com' : undefined;

        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/dashboard-rest
            endpoint: '/api/2/events/list',
            baseUrlOverride,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            events: parsed.data.map((event) => ({
                value: event.value,
                ...(event.display !== undefined && { display: event.display }),
                ...(event.totals !== undefined && { totals: event.totals }),
                ...(event.uniques !== undefined && { uniques: event.uniques }),
                ...(event.pct_dau !== undefined && { pct_dau: event.pct_dau }),
                ...(event.non_active !== undefined && { non_active: event.non_active }),
                ...(event.deleted !== undefined && { deleted: event.deleted }),
                ...(event.hidden !== undefined && { hidden: event.hidden }),
                ...(event.flow_hidden !== undefined && { flow_hidden: event.flow_hidden })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
