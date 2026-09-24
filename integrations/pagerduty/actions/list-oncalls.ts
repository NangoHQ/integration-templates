import { z } from 'zod';
import { createAction } from 'nango';

const ReferenceSchema = z.object({
    id: z.string().describe('Unique identifier of the referenced resource.'),
    type: z.string().describe('Resource type, e.g. "user_reference" or "schedule_reference".'),
    summary: z.string().optional().describe('Human-readable summary of the referenced resource.'),
    self: z.string().optional().describe('API URL of the referenced resource.'),
    html_url: z.string().optional().describe('Web URL of the referenced resource.')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of on-call entries to return per page.'),
        time_zone: z.string().optional().describe('Time zone in which dates in the result will be rendered, e.g. "UTC".'),
        include: z
            .array(z.string())
            .optional()
            .describe('Additional related objects to include in the response, e.g. "users", "schedules", "escalation_policies".'),
        user_ids: z.array(z.string()).optional().describe('Filter results to only on-call entries for the specified user IDs.'),
        escalation_policy_ids: z.array(z.string()).optional().describe('Filter results to only on-call entries for the specified escalation policy IDs.'),
        schedule_ids: z.array(z.string()).optional().describe('Filter results to only on-call entries for the specified schedule IDs.'),
        since: z.string().optional().describe('Start of the time range as an ISO 8601 timestamp. Defaults to current time.'),
        until: z.string().optional().describe('End of the time range as an ISO 8601 timestamp. Defaults to current time.'),
        earliest: z
            .boolean()
            .optional()
            .describe('Return only the earliest on-call entry for each combination of escalation policy, escalation level, and user.'),
        total: z.boolean().optional().describe('Populate the total field in the pagination envelope.')
    })
    .describe('Input to list current on-call entries across the account.');

const OnCallSchema = z.object({
    escalation_policy: ReferenceSchema.nullable().optional().describe('Escalation policy responsible for this on-call entry.'),
    escalation_level: z.number().describe('Escalation level within the policy.'),
    schedule: ReferenceSchema.nullable()
        .optional()
        .describe('Schedule governing this on-call entry. Null when the policy targets a user directly without a schedule.'),
    user: ReferenceSchema.nullable().optional().describe('User who is currently on-call.'),
    start: z.string().nullable().optional().describe('Start of the on-call period as an ISO 8601 timestamp. Null for permanent user on-calls.'),
    end: z.string().nullable().optional().describe('End of the on-call period as an ISO 8601 timestamp. Null when the user does not go off-call.')
});

const OutputSchema = z
    .object({
        oncalls: z.array(OnCallSchema).describe('Current on-call entries across escalation policies and schedules.'),
        next_offset: z.string().optional().describe('Offset to request the next page, if more results exist.'),
        limit: z.number().describe('Number of results returned in this page.'),
        offset: z.number().describe('Offset of the current page.'),
        total: z.number().optional().describe('Total number of results if total=true was requested, otherwise omitted.'),
        more: z.boolean().describe('Whether additional pages exist beyond this response.')
    })
    .describe('Output of the list on-calls action.');

/**
 * @tags: [read]
 * @tagReason: Retrieves current on-call assignments from the PagerDuty API without making changes.
 * @pitfalls: Omitting since or until unexpectedly collapses the query to the current moment because both default to the current time; future on-call ranges are capped at 90 days.
 */
const action = createAction({
    description: 'List who is currently on-call across every escalation policy and schedule on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['oncalls.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/oncalls',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.time_zone !== undefined && { time_zone: input.time_zone }),
                ...(input.include !== undefined && { 'include[]': input.include }),
                ...(input.user_ids !== undefined && { 'user_ids[]': input.user_ids }),
                ...(input.escalation_policy_ids !== undefined && { 'escalation_policy_ids[]': input.escalation_policy_ids }),
                ...(input.schedule_ids !== undefined && { 'schedule_ids[]': input.schedule_ids }),
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                ...(input.earliest !== undefined && { earliest: String(input.earliest) }),
                ...(input.total !== undefined && { total: String(input.total) })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            oncalls: z.array(
                z.object({
                    escalation_policy: ReferenceSchema.nullable().optional(),
                    escalation_level: z.number(),
                    schedule: ReferenceSchema.nullable().optional(),
                    user: ReferenceSchema.nullable().optional(),
                    start: z.string().nullable().optional(),
                    end: z.string().nullable().optional()
                })
            ),
            limit: z.number(),
            offset: z.number(),
            total: z.number().nullable().optional(),
            more: z.boolean()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            oncalls: parsed.oncalls,
            next_offset: parsed.more ? String(parsed.offset + parsed.limit) : undefined,
            limit: parsed.limit,
            offset: parsed.offset,
            total: parsed.total ?? undefined,
            more: parsed.more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
