import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        service_ids: z.array(z.string()).optional().describe('Return only incidents associated with the passed service IDs.'),
        team_ids: z.array(z.string()).optional().describe('Return only incidents related to the passed team IDs.'),
        statuses: z
            .array(z.enum(['triggered', 'acknowledged', 'resolved']))
            .optional()
            .describe('Return only incidents with the given statuses.'),
        date_range: z.enum(['all']).optional().describe('When set to all, the since and until parameters and defaults are ignored.'),
        since: z.string().optional().describe('The start of the date range over which you want to search. Maximum range is 6 months and default is 1 month.'),
        until: z.string().optional().describe('The end of the date range over which you want to search. Maximum range is 6 months and default is 1 month.'),
        incident_key: z
            .string()
            .optional()
            .describe(
                'Incident de-duplication key. Incidents with child alerts do not have an incident key; querying by incident key will return incidents whose alerts have alert_key matching the given incident key.'
            ),
        user_ids: z
            .array(z.string())
            .optional()
            .describe(
                'Return only incidents currently assigned to the passed user IDs. Note: When using this filter, you will only receive incidents with statuses of triggered or acknowledged.'
            ),
        urgencies: z
            .array(z.enum(['high', 'low']))
            .optional()
            .describe('Array of the urgencies of the incidents to be returned. Defaults to all urgencies.')
    })
    .describe('Filters for counting incidents matching specific criteria.');

const OutputSchema = z
    .object({
        total: z.number().describe('The total count of incidents matching the provided filters.')
    })
    .describe('Total count of incidents matching the provided filters.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an incident count from the PagerDuty API without modifying any data.
 * @pitfalls: Filtering by user_ids only returns triggered or acknowledged incidents because resolved incidents are not assigned to any user. The since and until parameters support a maximum range of 6 months and default to 1 month.
 */
const action = createAction({
    description: 'Get a count of incidents matching a filter, without fetching the incident records themselves.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // PagerDuty requires array-valued filters as repeated bracketed keys, e.g.
        // service_ids[]=A&service_ids[]=B. ProxyConfiguration.params only accepts
        // string | Record<string, string | number>, so array values can't be passed
        // through the params object (the proxy would collapse them into a single
        // comma-joined value, which PagerDuty rejects). Build the query string manually.
        const searchParams = new URLSearchParams();

        if (input.service_ids !== undefined && input.service_ids.length > 0) {
            for (const id of input.service_ids) {
                searchParams.append('service_ids[]', id);
            }
        }
        if (input.team_ids !== undefined && input.team_ids.length > 0) {
            for (const id of input.team_ids) {
                searchParams.append('team_ids[]', id);
            }
        }
        if (input.statuses !== undefined && input.statuses.length > 0) {
            for (const status of input.statuses) {
                searchParams.append('statuses[]', status);
            }
        }
        if (input.date_range !== undefined) {
            searchParams.set('date_range', input.date_range);
        }
        if (input.since !== undefined) {
            searchParams.set('since', input.since);
        }
        if (input.until !== undefined) {
            searchParams.set('until', input.until);
        }
        if (input.incident_key !== undefined) {
            searchParams.set('incident_key', input.incident_key);
        }
        if (input.user_ids !== undefined && input.user_ids.length > 0) {
            for (const id of input.user_ids) {
                searchParams.append('user_ids[]', id);
            }
        }
        if (input.urgencies !== undefined && input.urgencies.length > 0) {
            for (const urgency of input.urgencies) {
                searchParams.append('urgencies[]', urgency);
            }
        }

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/e650352f3c366-count-incidents
            endpoint: '/incidents/count',
            params: searchParams.toString(),
            retries: 3
        });

        const CountSchema = z.object({
            total: z.number()
        });

        const parsed = CountSchema.parse(response.data);

        return {
            total: parsed.total
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
