import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const logicTypeDescription =
    'Condition combination logic: "any" (any condition matches), "any-short" (any condition matches, short-circuited), "all" (all conditions match) or "none" (no condition matches).';

const ConditionSchema = z
    .record(z.string(), z.unknown())
    .describe(
        'A condition object whose shape depends on its "type" (e.g. {"type": "first_seen_event", "comparison": true, "conditionResult": true}). See the Sentry docs for all condition types.'
    );

const ActionObjectSchema = z
    .record(z.string(), z.unknown())
    .describe(
        'An action object whose shape depends on its "type" (e.g. {"type": "email", "config": {"targetType": "team", "targetIdentifier": "456789"}, "data": {}, "status": "active"}). See the Sentry docs for all action types.'
    );

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization. Example: "nangodev".'),
        name: z.string().max(256).describe('The name of the alert rule. Example: "Notify on high priority issues".'),
        enabled: z.boolean().optional().describe('Whether the alert rule is enabled. Defaults to true when omitted.'),
        detector_ids: z
            .array(z.number().int())
            .optional()
            .describe('The IDs of the monitors (detectors) to connect this alert rule to. Use the list-monitors action to find monitor IDs.'),
        config: z
            .looseObject({
                frequency: z
                    .number()
                    .int()
                    .optional()
                    .describe('How often the alert rule can fire, in minutes. Documented values: 0, 5, 10, 30, 60, 180, 720 or 1440. Example: 1440.')
            })
            .optional()
            .describe('The alert rule configuration; typically only the firing frequency.'),
        environment: z
            .string()
            .nullable()
            .optional()
            .describe('The name of the environment the alert rule evaluates in. null or omitted applies the rule to all environments.'),
        triggers: z
            .object({
                logic_type: z.enum(['any', 'any-short', 'all', 'none']).describe(logicTypeDescription),
                conditions: z.array(ConditionSchema).optional().describe('The conditions that trigger the alert rule. Defaults to an empty list when omitted.')
            })
            .optional()
            .describe('The conditions on which the alert rule triggers. When omitted, Sentry creates the rule with empty trigger conditions.'),
        action_filters: z
            .array(
                z.object({
                    logic_type: z.enum(['any', 'any-short', 'all', 'none']).describe(logicTypeDescription),
                    conditions: z
                        .array(ConditionSchema)
                        .optional()
                        .describe('The filters an issue must match before the actions fire. Defaults to an empty list when omitted.'),
                    actions: z.array(ActionObjectSchema).describe('The actions (notifications, tickets, etc.) to fire when the conditions match.')
                })
            )
            .optional()
            .describe(
                'The filters to run before firing, each with the action(s) to fire. When omitted, Sentry creates the rule with no actions, so nothing is notified.'
            ),
        owner: z
            .string()
            .nullable()
            .optional()
            .describe(
                'The owner of the alert rule, an ID prefixed with the owner type: "user:<id>" or "team:<id>". Example: "team:456789". null or omitted leaves the rule unowned.'
            )
    })
    .describe('Input for creating a Sentry alert rule (workflow); only name is required.');

const OutputTriggerSchema = z.object({
    id: z.string().optional().describe('The ID of the trigger condition group.'),
    organizationId: z.string().optional().describe('The ID of the organization the trigger belongs to.'),
    logicType: z.string().optional().describe('The condition combination logic of the trigger, e.g. "any-short".'),
    conditions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('The trigger conditions; empty when the rule was created without explicit triggers.'),
    actions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('The actions attached to the trigger; empty when the rule was created without actions.')
});

const OutputActionFilterSchema = z.object({
    id: z.string().optional().describe('The ID of the action filter.'),
    organizationId: z.string().optional().describe('The ID of the organization the action filter belongs to.'),
    logicType: z.string().optional().describe('The condition combination logic of the filter, e.g. "any-short".'),
    conditions: z.array(z.record(z.string(), z.unknown())).optional().describe('The filter conditions an issue must match before the actions fire.'),
    actions: z.array(z.record(z.string(), z.unknown())).optional().describe('The actions that fire when the conditions match.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the created alert rule. Example: "1234567".'),
        name: z.string().describe('The name of the alert rule.'),
        organizationId: z.string().describe('The ID of the organization the alert rule belongs to.'),
        createdBy: z.string().nullable().describe('The ID of the user who created the alert rule; null when not attributable to a user.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the alert rule was created.'),
        dateUpdated: z.string().describe('ISO 8601 timestamp of when the alert rule was last updated.'),
        triggers: OutputTriggerSchema.nullable().describe('The conditions on which the alert rule triggers; null when no trigger is set.'),
        actionFilters: z.array(OutputActionFilterSchema).nullable().describe('The filters and actions run when the alert fires; null when none are set.'),
        environment: z.string().nullable().describe('The environment the alert rule evaluates in; null means all environments.'),
        config: z.record(z.string(), z.unknown()).describe('The alert rule configuration, typically {"frequency": <minutes>}.'),
        detectorIds: z.array(z.string()).nullable().describe('The IDs of the monitors (detectors) connected to this alert rule; null when none are connected.'),
        enabled: z.boolean().describe('Whether the alert rule is enabled.'),
        lastTriggered: z.string().nullable().describe('ISO 8601 timestamp of when the alert rule last fired; null when it has never fired.'),
        owner: z.string().nullable().describe('The owner of the alert rule ("user:<id>" or "team:<id>"); null when unowned.')
    })
    .describe('The created Sentry alert rule (workflow).');

/**
 * @tags: [write]
 * @tagReason: Creates a new alert rule in Sentry via POST; a provider write with no read or delete behavior.
 * @pitfalls: A rule created with only a name is enabled but never notifies: Sentry defaults triggers and action filters to empty arrays, so conditions/actions must be added afterwards for the alert to fire. Names are not unique: calling this action repeatedly with the same name creates a separate alert rule each time.
 */
const action = createAction({
    description: 'Create a new alert rule.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['alerts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/monitors/create-an-alert-for-an-organization/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/workflows/`,
            data: {
                name: input.name,
                ...(input.enabled !== undefined && { enabled: input.enabled }),
                ...(input.detector_ids !== undefined && { detector_ids: input.detector_ids }),
                ...(input.config !== undefined && { config: input.config }),
                ...(input.environment !== undefined && { environment: input.environment }),
                ...(input.triggers !== undefined && { triggers: input.triggers }),
                ...(input.action_filters !== undefined && { action_filters: input.action_filters }),
                ...(input.owner !== undefined && { owner: input.owner })
            },
            // Non-idempotent create: Sentry provides no idempotency key, so retrying
            // after a lost response could create a duplicate alert rule.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
