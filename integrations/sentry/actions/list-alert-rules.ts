import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization whose alert rules should be listed. Example: "nangodev"'),
        cursor: z.string().min(1).optional().describe('Pagination cursor returned as `nextCursor` by a previous call. Omit to fetch the first page.')
    })
    .describe('Input for listing the alert rules of a Sentry organization.');

const AlertRuleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the alert rule (Sentry workflow). Example: "123"'),
        name: z.string().describe('Display name of the alert rule. Example: "Send a notification for high priority issues"'),
        organizationId: z.string().describe('ID of the Sentry organization the alert rule belongs to. Example: "1"'),
        createdBy: z
            .string()
            .optional()
            .describe('ID of the user who created the alert rule. Omitted when not set, such as on Sentry auto-created default rules. Example: "34567"'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the alert rule was created. Example: "2025-03-18T20:48:55.495059Z"'),
        dateUpdated: z.string().describe('ISO 8601 timestamp of when the alert rule was last updated. Example: "2025-03-18T20:48:55.579094Z"'),
        triggers: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Trigger block that decides when the alert fires, including its logic type and conditions. Omitted when the rule has no trigger block.'),
        actionFilters: z
            .array(z.record(z.string(), z.unknown()))
            .describe('Ordered list of action-filter blocks evaluated after the trigger; each block carries its own conditions and notification actions.'),
        environment: z.string().optional().describe('Name of the environment the rule is restricted to. Omitted when the rule applies to all environments.'),
        config: z.record(z.string(), z.unknown()).describe('Rule configuration, such as the evaluation frequency in minutes. Example: {"frequency": 30}'),
        detectorIds: z.array(z.string()).optional().describe('IDs of the monitors (detectors) connected to this alert rule.'),
        enabled: z.boolean().describe('Whether the alert rule is currently enabled.'),
        lastTriggered: z.string().optional().describe('ISO 8601 timestamp of the last time the alert fired. Omitted when the rule has never fired.'),
        owner: z
            .string()
            .optional()
            .describe('Owner of the rule, prefixed with the owner type. Examples: "user:123456", "team:456789". Omitted when no owner is assigned.')
    })
    .describe('A Sentry alert rule (workflow).');

const OutputSchema = z
    .object({
        alertRules: z.array(AlertRuleSchema).describe("List of the organization's alert rules (Sentry workflows) for the requested page."),
        nextCursor: z.string().optional().describe('Cursor to pass as `cursor` to fetch the next page. Omitted when there are no more results.')
    })
    .describe('Page of Sentry alert rules with an optional cursor to the next page.');

const ProviderWorkflowSchema = z.object({
    id: z.string(),
    name: z.string(),
    organizationId: z.string(),
    createdBy: z.string().nullable(),
    dateCreated: z.string(),
    dateUpdated: z.string(),
    triggers: z.record(z.string(), z.unknown()).nullable(),
    actionFilters: z
        .array(z.record(z.string(), z.unknown()))
        .nullable()
        .transform((actionFilters) => actionFilters ?? []),
    environment: z.string().nullable(),
    config: z.record(z.string(), z.unknown()),
    detectorIds: z.array(z.string()).nullable(),
    enabled: z.boolean(),
    lastTriggered: z.string().nullable(),
    owner: z.string().nullable()
});

function parseNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    for (const entry of linkHeader.split(',')) {
        const parts = entry.split(';').map((part) => part.trim());
        if (!parts.includes('rel="next"') || parts.includes('results="false"')) {
            continue;
        }
        const cursorPart = parts.find((part) => part.startsWith('cursor='));
        const match = cursorPart ? /^cursor="(.+)"$/.exec(cursorPart) : null;
        if (match?.[1]) {
            return match[1];
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only fetches the organization's alert rules with a GET request; it never creates, updates, or deletes anything in Sentry.
 * @pitfalls: The list can include Sentry's auto-created default alert rules (an org-wide rule plus one per project) that no user explicitly created. Rule names are not unique, so distinguish rules by id rather than name.
 */
const action = createAction({
    description: 'List the organization\'s alert rules (Sentry\'s current public API models these as "alerts"/"workflows").',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['alerts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.sentry.io/api/monitors/fetch-alerts/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/workflows/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const workflows = z.array(ProviderWorkflowSchema).parse(response.data);

        const linkHeader = response.headers['link'];
        const nextCursor = parseNextCursor(typeof linkHeader === 'string' ? linkHeader : undefined);

        return {
            alertRules: workflows.map((workflow) => ({
                id: workflow.id,
                name: workflow.name,
                organizationId: workflow.organizationId,
                ...(workflow.createdBy != null && { createdBy: workflow.createdBy }),
                dateCreated: workflow.dateCreated,
                dateUpdated: workflow.dateUpdated,
                ...(workflow.triggers != null && { triggers: workflow.triggers }),
                actionFilters: workflow.actionFilters,
                ...(workflow.environment != null && { environment: workflow.environment }),
                config: workflow.config,
                ...(workflow.detectorIds != null && { detectorIds: workflow.detectorIds }),
                enabled: workflow.enabled,
                ...(workflow.lastTriggered != null && { lastTriggered: workflow.lastTriggered }),
                ...(workflow.owner != null && { owner: workflow.owner })
            })),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
