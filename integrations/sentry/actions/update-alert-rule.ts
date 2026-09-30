import { z } from 'zod';
import { createAction } from 'nango';

const logicTypeSchema = z.enum(['any', 'any-short', 'all', 'none']);

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the alert rule belongs to. Example: "nangodev"'),
        workflow_id: z
            .string()
            .regex(/^\d+$/)
            .describe('The numeric ID of the alert rule (workflow) to update, as returned by list/get alert rule actions. Example: "6085959"'),
        name: z.string().max(256).describe('The name of the alert rule. Sentry requires this field on every update, even when only other fields change.'),
        enabled: z.boolean().optional().describe('Whether the alert rule is enabled. Omit to leave the current state unchanged.'),
        detector_ids: z.array(z.number().int()).optional().describe('IDs of the monitors (detectors) to connect this alert rule to. Example: [12345678]'),
        config: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Alert rule configuration object, typically the firing frequency in minutes. Example: {"frequency": 1440}'),
        environment: z
            .string()
            .nullable()
            .optional()
            .describe('Name of the environment the alert rule evaluates in. Set to null to clear the environment. Example: "production"'),
        triggers: z
            .looseObject({
                logic_type: logicTypeSchema.describe('How the trigger conditions are combined: "any", "any-short", "all", or "none"'),
                conditions: z
                    .array(z.record(z.string(), z.unknown()))
                    .optional()
                    .describe(
                        'Trigger condition objects; the exact shape varies by condition "type". Example: [{"type": "first_seen_event", "comparison": true, "conditionResult": true}]'
                    )
            })
            .optional()
            .describe('The conditions on which the alert rule triggers'),
        action_filters: z
            .array(
                z.looseObject({
                    logic_type: logicTypeSchema.describe('How the filter conditions are combined: "any", "any-short", "all", or "none"'),
                    conditions: z
                        .array(z.record(z.string(), z.unknown()))
                        .optional()
                        .describe('Filter condition objects evaluated before actions fire; the exact shape varies by condition "type"'),
                    actions: z
                        .array(z.record(z.string(), z.unknown()))
                        .describe(
                            'Action objects to fire when the filter passes; the exact shape varies by action "type". Example: [{"type": "email", "data": {}, "config": {"targetType": "issue_owners"}}]'
                        )
                })
            )
            .optional()
            .describe('The filters to run before the alert fires and the action(s) to fire'),
        owner: z
            .string()
            .nullable()
            .optional()
            .describe('Owner of the alert rule, a user or team ID prefixed with "user:" or "team:". Set to null to clear the owner. Example: "team:456789"')
    })
    .describe('Fields to update on an existing Sentry alert rule (workflow)');

const WorkflowTriggersSchema = z
    .object({
        id: z.string().optional().describe('The ID of the trigger group'),
        organizationId: z.string().optional().describe('The ID of the organization the trigger group belongs to'),
        logicType: z.string().optional().describe('How the trigger conditions are combined'),
        conditions: z.array(z.record(z.string(), z.unknown())).optional().describe('Trigger condition objects; the exact shape varies by condition "type"'),
        actions: z.array(z.record(z.string(), z.unknown())).optional().describe('Action objects attached directly to the trigger group')
    })
    .describe('The conditions on which the alert rule triggers');

const WorkflowActionFilterSchema = z
    .object({
        id: z.string().optional().describe('The ID of the action filter'),
        organizationId: z.string().optional().describe('The ID of the organization the action filter belongs to'),
        logicType: z.string().optional().describe('How the filter conditions are combined'),
        conditions: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Filter condition objects evaluated before actions fire; the exact shape varies by condition "type"'),
        actions: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Action objects fired when the filter passes; the exact shape varies by action "type"')
    })
    .describe('A filter that runs before the alert fires, plus the action(s) it fires');

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the alert rule. Example: "6085959"'),
        name: z.string().describe('The name of the alert rule'),
        organizationId: z.string().describe('The ID of the organization the alert rule belongs to'),
        enabled: z.boolean().describe('Whether the alert rule is enabled'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the alert rule was created. Example: "2026-09-29T14:35:10.632282Z"'),
        dateUpdated: z.string().describe('ISO 8601 timestamp of when the alert rule was last updated'),
        createdBy: z.string().optional().describe('The ID of the user who created the alert rule'),
        environment: z.string().optional().describe('The name of the environment the alert rule evaluates in'),
        config: z
            .record(z.string(), z.unknown())
            .describe('Alert rule configuration object, typically the firing frequency in minutes. Example: {"frequency": 1440}'),
        detectorIds: z.array(z.string()).optional().describe('IDs of the monitors (detectors) connected to this alert rule'),
        lastTriggered: z.string().optional().describe('ISO 8601 timestamp of when the alert rule last fired'),
        owner: z.string().optional().describe('Owner of the alert rule, prefixed with "user:" or "team:"'),
        triggers: WorkflowTriggersSchema.optional(),
        actionFilters: z.array(WorkflowActionFilterSchema).optional().describe('Filters that run before the alert fires and the action(s) they fire')
    })
    .describe('The updated Sentry alert rule (workflow)');

const ProviderWorkflowSchema = z.object({
    id: z.string(),
    name: z.string(),
    organizationId: z.string(),
    createdBy: z.string().nullable(),
    dateCreated: z.string(),
    dateUpdated: z.string(),
    triggers: z
        .object({
            id: z.string().optional(),
            organizationId: z.string().optional(),
            logicType: z.string().optional(),
            conditions: z.array(z.record(z.string(), z.unknown())).optional(),
            actions: z.array(z.record(z.string(), z.unknown())).optional()
        })
        .nullable(),
    actionFilters: z
        .array(
            z.object({
                id: z.string().optional(),
                organizationId: z.string().optional(),
                logicType: z.string().optional(),
                conditions: z.array(z.record(z.string(), z.unknown())).optional(),
                actions: z.array(z.record(z.string(), z.unknown())).optional()
            })
        )
        .nullable(),
    environment: z.string().nullable(),
    config: z.record(z.string(), z.unknown()),
    detectorIds: z.array(z.string()).nullable(),
    enabled: z.boolean(),
    lastTriggered: z.string().nullable(),
    owner: z.string().nullable()
});

/**
 * @tags: [write]
 * @tagReason: Mutates an existing Sentry alert rule's name, enabled state, config, and trigger/action wiring through the provider API.
 * @pitfalls: Sentry requires `name` on every update even when only other fields change, but omitted optional fields are preserved rather than reset. The alert workflows API is in beta and subject to change, and trigger/action-filter objects have shapes that vary by condition or action type.
 */
const action = createAction({
    description: "Update an alert rule's name, enabled state, config, or trigger/action wiring.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['alerts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/monitors/update-an-alert-by-id/
        const response = await nango.put({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/workflows/${encodeURIComponent(input.workflow_id)}/`,
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
            // PUT of a full field set onto an existing resource is naturally idempotent, so retries are safe.
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Alert rule not found',
                workflow_id: input.workflow_id
            });
        }

        const workflow = ProviderWorkflowSchema.parse(response.data);

        return {
            id: workflow.id,
            name: workflow.name,
            organizationId: workflow.organizationId,
            enabled: workflow.enabled,
            dateCreated: workflow.dateCreated,
            dateUpdated: workflow.dateUpdated,
            config: workflow.config,
            ...(workflow.createdBy != null && { createdBy: workflow.createdBy }),
            ...(workflow.environment != null && { environment: workflow.environment }),
            ...(workflow.detectorIds != null && { detectorIds: workflow.detectorIds }),
            ...(workflow.lastTriggered != null && { lastTriggered: workflow.lastTriggered }),
            ...(workflow.owner != null && { owner: workflow.owner }),
            ...(workflow.triggers != null && { triggers: workflow.triggers }),
            ...(workflow.actionFilters != null && { actionFilters: workflow.actionFilters })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
