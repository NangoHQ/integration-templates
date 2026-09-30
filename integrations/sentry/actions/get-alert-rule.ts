import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the alert rule belongs to. Example: "my-org"'),
        workflow_id: z.string().describe('The numeric ID of the alert rule (workflow) to retrieve. Example: "1234567"')
    })
    .describe('Input for retrieving a single Sentry alert rule.');

const AlertRuleConditionSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the condition.'),
    type: z.string().optional().describe('The condition type. Example: "new_high_priority_issue"'),
    comparison: z.unknown().optional().describe('The value the condition compares against. The shape varies by condition type (boolean, integer, or list).'),
    conditionResult: z.unknown().optional().describe('The comparison result required for the condition to pass.')
});

const AlertRuleActionSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the action.'),
    type: z.string().optional().describe('The action type. Example: "email"'),
    integrationId: z.string().nullable().optional().describe('ID of the third-party integration the action uses, or null when it does not use one.'),
    data: z.record(z.string(), z.unknown()).optional().describe('Additional action-specific settings as key/value pairs.'),
    config: z.record(z.string(), z.unknown()).optional().describe('Action configuration as key/value pairs, such as the notification target.'),
    status: z.string().optional().describe('Status of the action. Example: "active"')
});

const AlertRuleConditionGroupSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the condition group.'),
    organizationId: z.string().optional().describe('ID of the organization the condition group belongs to.'),
    logicType: z.string().optional().describe('Logic used to combine the conditions in this group. Example: "any"'),
    conditions: z.array(AlertRuleConditionSchema).optional().describe('Conditions evaluated by this group.'),
    actions: z.array(AlertRuleActionSchema).optional().describe('Actions executed when the conditions of this group pass.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the alert rule.'),
        name: z.string().describe('Name of the alert rule.'),
        organizationId: z.string().describe('ID of the organization the alert rule belongs to.'),
        createdBy: z.string().nullable().describe('ID of the user who created the alert rule, or null when it was created automatically.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the alert rule was created.'),
        dateUpdated: z.string().describe('ISO 8601 timestamp of when the alert rule was last updated.'),
        triggers: AlertRuleConditionGroupSchema.nullable().describe(
            'Trigger condition group that decides when the alert rule fires, or null when none is set.'
        ),
        actionFilters: z
            .array(AlertRuleConditionGroupSchema)
            .nullable()
            .describe('Condition groups that gate which actions run after the trigger fires, or null when none are set.'),
        environment: z.string().nullable().describe('Environment the alert rule is scoped to, or null when it applies to all environments.'),
        config: z.record(z.string(), z.unknown()).describe('Alert rule configuration as key/value pairs, such as the minimum minutes between alerts.'),
        detectorIds: z.array(z.string()).nullable().describe('IDs of the detectors linked to this alert rule, or null when none are linked.'),
        enabled: z.boolean().describe('Whether the alert rule is enabled.'),
        lastTriggered: z.string().nullable().describe('ISO 8601 timestamp of when the alert rule last fired, or null when it never has.'),
        owner: z.string().nullable().describe('Owner of the alert rule, or null when it is unowned.')
    })
    .describe('A single Sentry alert rule (workflow) with its trigger and action condition groups.');

/**
 * @tags: [read]
 * @tagReason: Fetches a single alert rule (workflow) from Sentry without mutating any provider state.
 * @pitfalls: Requires an API token with alerts:read (or org:read/org:write/org:admin) scope, otherwise the call fails with a permission error. Only Sentry's current workflows-based alert rules are retrievable; legacy alert rules cannot be fetched with this action.
 */
const action = createAction({
    description: 'Retrieve a single alert rule.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['alerts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/ (GET /0/organizations/{organization_id_or_slug}/workflows/{workflow_id}/)
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/workflows/${encodeURIComponent(input.workflow_id)}/`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
