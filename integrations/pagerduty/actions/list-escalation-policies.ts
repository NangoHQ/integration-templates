import { z } from 'zod';
import { createAction } from 'nango';

const ListEscalationPoliciesInput = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor representing the offset. Omit for the first page.'),
        query: z.string().optional().describe('Query filter to search escalation policies by name.'),
        user_ids: z.array(z.string()).optional().describe('Filter escalation policies by user IDs assigned within their escalation rules.'),
        team_ids: z.array(z.string()).optional().describe('Filter escalation policies by associated team IDs.'),
        include: z.array(z.string()).optional().describe('Additional related objects to include in the response. Example: ["services", "teams"].'),
        sort_by: z.string().optional().describe('Sort order for results. Example: "name:asc".'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results per page.'),
        total: z.boolean().optional().describe('Include total count in the response. Defaults to false for faster responses.')
    })
    .describe('Input for listing escalation policies with optional filters and pagination.');

const ProviderEscalationPolicyTargetSchema = z.object({
    id: z.string(),
    type: z.string().nullable().optional(),
    summary: z.string().nullable().optional()
});

const ProviderEscalationRuleSchema = z.object({
    id: z.string(),
    escalation_delay_in_minutes: z.number().nullable().optional(),
    targets: z.array(ProviderEscalationPolicyTargetSchema).nullable().optional()
});

const ProviderServiceReferenceSchema = z.object({
    id: z.string(),
    type: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderTeamReferenceSchema = z.object({
    id: z.string(),
    type: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderEscalationPolicySchema = z.object({
    id: z.string(),
    type: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    escalation_rules: z.array(ProviderEscalationRuleSchema).nullable().optional(),
    services: z.array(ProviderServiceReferenceSchema).nullable().optional(),
    teams: z.array(ProviderTeamReferenceSchema).nullable().optional(),
    num_loops: z.number().nullable().optional(),
    on_call_handoff_notifications: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    escalation_policies: z.array(ProviderEscalationPolicySchema),
    limit: z.number(),
    offset: z.number(),
    total: z.number().nullable().optional(),
    more: z.boolean()
});

const EscalationPolicyTargetSchema = z.object({
    id: z.string().describe('Target ID.'),
    type: z.string().optional().describe('Target type, such as "user_reference" or "schedule_reference".'),
    summary: z.string().optional().describe('Human-readable summary of the target.')
});

const EscalationRuleSchema = z.object({
    id: z.string().describe('Escalation rule ID.'),
    escalation_delay_in_minutes: z.number().optional().describe('Minutes to wait before escalating to the next rule.'),
    targets: z.array(EscalationPolicyTargetSchema).optional().describe('Targets for this escalation rule.')
});

const ServiceReferenceSchema = z.object({
    id: z.string().describe('Service ID.'),
    type: z.string().optional().describe('Service reference type.'),
    summary: z.string().optional().describe('Human-readable service summary.'),
    self: z.string().optional().describe('API URL of the service.'),
    html_url: z.string().optional().describe('Web URL of the service.')
});

const TeamReferenceSchema = z.object({
    id: z.string().describe('Team ID.'),
    type: z.string().optional().describe('Team reference type.'),
    summary: z.string().optional().describe('Human-readable team summary.'),
    self: z.string().optional().describe('API URL of the team.'),
    html_url: z.string().optional().describe('Web URL of the team.')
});

const EscalationPolicySchema = z.object({
    id: z.string().describe('Escalation policy ID.'),
    type: z.string().optional().describe('Resource type, typically "escalation_policy".'),
    summary: z.string().optional().describe('Human-readable summary of the escalation policy.'),
    self: z.string().optional().describe('API URL of the escalation policy.'),
    html_url: z.string().optional().describe('Web URL of the escalation policy.'),
    name: z.string().describe('Name of the escalation policy.'),
    description: z.string().optional().describe('Description of the escalation policy.'),
    escalation_rules: z.array(EscalationRuleSchema).optional().describe('Ordered list of escalation rules.'),
    services: z.array(ServiceReferenceSchema).optional().describe('Services associated with this escalation policy.'),
    teams: z.array(TeamReferenceSchema).optional().describe('Teams associated with this escalation policy.'),
    num_loops: z.number().optional().describe('Number of times to loop through escalation rules.'),
    on_call_handoff_notifications: z.string().optional().describe('Handoff notification configuration.')
});

const ListEscalationPoliciesOutput = z
    .object({
        escalation_policies: z.array(EscalationPolicySchema).describe('List of escalation policies matching the query.'),
        next_cursor: z.string().optional().describe('Cursor for the next page of results. Omit if there are no more pages.'),
        limit: z.number().describe('Number of results returned in this page.'),
        offset: z.number().describe('Offset of the current page.'),
        total: z.number().optional().describe('Total number of matching results when total=true was requested.'),
        more: z.boolean().describe('Whether additional pages of results are available.')
    })
    .describe('Output containing a paginated list of escalation policies.');

/**
 * @tags: [read]
 * @tagReason: Lists escalation policies via a GET request to the PagerDuty API.
 */
const action = createAction({
    description: 'List escalation policies, optionally filtered by user or team.',
    version: '1.0.0',
    input: ListEscalationPoliciesInput,
    output: ListEscalationPoliciesOutput,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof ListEscalationPoliciesOutput>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (input.cursor && isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric offset string.'
            });
        }

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1escalation_policies/get
            endpoint: '/escalation_policies',
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.user_ids !== undefined && { 'user_ids[]': input.user_ids }),
                ...(input.team_ids !== undefined && { 'team_ids[]': input.team_ids }),
                ...(input.include !== undefined && { 'include[]': input.include }),
                ...(input.sort_by !== undefined && { sort_by: input.sort_by }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { offset: String(offset) }),
                ...(input.total !== undefined && { total: String(input.total) })
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.parse(response.data);

        const escalationPolicies = raw.escalation_policies.map((item) => {
            return {
                id: item.id,
                ...(item.type != null && { type: item.type }),
                ...(item.summary != null && { summary: item.summary }),
                ...(item.self != null && { self: item.self }),
                ...(item.html_url != null && { html_url: item.html_url }),
                name: item.name,
                ...(item.description != null && { description: item.description }),
                ...(item.escalation_rules != null && {
                    escalation_rules: item.escalation_rules.map((rule) => ({
                        id: rule.id,
                        ...(rule.escalation_delay_in_minutes != null && { escalation_delay_in_minutes: rule.escalation_delay_in_minutes }),
                        ...(rule.targets != null && {
                            targets: rule.targets.map((target) => ({
                                id: target.id,
                                ...(target.type != null && { type: target.type }),
                                ...(target.summary != null && { summary: target.summary })
                            }))
                        })
                    }))
                }),
                ...(item.services != null && {
                    services: item.services.map((service) => ({
                        id: service.id,
                        ...(service.type != null && { type: service.type }),
                        ...(service.summary != null && { summary: service.summary }),
                        ...(service.self != null && { self: service.self }),
                        ...(service.html_url != null && { html_url: service.html_url })
                    }))
                }),
                ...(item.teams != null && {
                    teams: item.teams.map((team) => ({
                        id: team.id,
                        ...(team.type != null && { type: team.type }),
                        ...(team.summary != null && { summary: team.summary }),
                        ...(team.self != null && { self: team.self }),
                        ...(team.html_url != null && { html_url: team.html_url })
                    }))
                }),
                ...(item.num_loops != null && { num_loops: item.num_loops }),
                ...(item.on_call_handoff_notifications != null && { on_call_handoff_notifications: item.on_call_handoff_notifications })
            };
        });

        const nextOffset = raw.offset + raw.limit;

        return {
            escalation_policies: escalationPolicies,
            ...(raw.more && { next_cursor: String(nextOffset) }),
            limit: raw.limit,
            offset: raw.offset,
            ...(raw.total != null && { total: raw.total }),
            more: raw.more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
