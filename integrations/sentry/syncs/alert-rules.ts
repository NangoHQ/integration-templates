import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AlertRuleConditionSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the condition, e.g. "2345"'),
        type: z.string().optional().describe('The type of condition evaluated by the alert, e.g. "new_high_priority_issue" or "event_frequency_count"'),
        comparison: z
            .unknown()
            .optional()
            .describe(
                'The value the condition compares against. A boolean or number for simple conditions, or a condition-specific object such as {"value": 100, "interval": "1h"} for frequency conditions'
            ),
        conditionResult: z.unknown().optional().describe('The result the condition must produce for it to be considered met, usually a boolean such as true')
    })
    .describe('A single condition evaluated by an alert rule trigger or action filter');

const AlertRuleActionSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the action, e.g. "234"'),
        type: z.string().optional().describe('The type of action executed when the alert fires, e.g. "email" or "slack"'),
        integrationId: z
            .string()
            .nullable()
            .optional()
            .describe('The id of the third-party integration this action targets, e.g. a Slack workspace id. Null when no integration is involved'),
        data: z.record(z.string(), z.string()).optional().describe('Additional string-keyed action data, e.g. {"fallthroughType": "ActiveMembers"}'),
        config: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Action-specific configuration, e.g. {"targetType": "issue_owners", "targetIdentifier": "1234567890"}'),
        status: z.string().optional().describe('The status of the action, e.g. "active"')
    })
    .describe('An action executed when the alert rule conditions are met');

const AlertRuleTriggerGroupSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the trigger or action filter, e.g. "12345"'),
        organizationId: z.string().optional().describe('Identifier of the organization the trigger or action filter belongs to'),
        logicType: z.string().optional().describe('How the conditions are combined, e.g. "any-short" (any condition) or "all" (all conditions)'),
        conditions: z.array(AlertRuleConditionSchema).optional().describe('The conditions evaluated by this trigger or action filter'),
        actions: z.array(AlertRuleActionSchema).optional().describe('The actions executed when the conditions are met')
    })
    .describe('A group of conditions and actions used as the alert rule trigger or as an action filter');

const AlertRuleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the alert rule, e.g. "123"'),
        name: z.string().describe('The name of the alert rule, e.g. "Send a notification for high priority issues"'),
        organizationId: z.string().describe('Identifier of the organization the alert rule belongs to'),
        createdBy: z.string().nullable().describe('The id of the user that created the alert rule. Null when the rule was created automatically by Sentry'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the alert rule was created, e.g. "2025-03-18T20:48:55.495059Z"'),
        dateUpdated: z.string().describe('ISO 8601 timestamp of when the alert rule was last updated, e.g. "2025-03-18T20:48:55.579094Z"'),
        enabled: z.boolean().describe('Whether the alert rule is enabled'),
        environment: z.string().nullable().describe('The name of the environment the alert rule is scoped to. Null when the rule applies to all environments'),
        owner: z
            .string()
            .nullable()
            .describe('The owner of the alert rule in the form "user:<id>" or "team:<id>", e.g. "user:123456". Null when the rule has no owner'),
        lastTriggered: z.string().nullable().describe('ISO 8601 timestamp of when the alert rule last fired. Null when the rule has never fired'),
        detectorIds: z
            .array(z.string())
            .nullable()
            .describe('The ids of the detectors (monitors) connected to this alert rule. Null or empty when no detectors are connected'),
        config: z.record(z.string(), z.unknown()).describe('Rule-level configuration, e.g. {"frequency": 30} for the minimum minutes between notifications'),
        triggers: AlertRuleTriggerGroupSchema.nullable().describe(
            'The trigger conditions that cause the alert rule to fire. Null when the rule has no trigger configured'
        ),
        actionFilters: z
            .array(AlertRuleTriggerGroupSchema)
            .nullable()
            .describe('The action filters evaluated after the trigger, each pairing additional conditions with the actions to run')
    })
    .describe('A Sentry organization alert rule ("workflow" in the Sentry API)');

const OrganizationSchema = z.object({
    id: z.string(),
    slug: z.string()
});

const sync = createSync({
    description: "Sync the organization's alert rules (workflows in Sentry's current public API)",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['org:read', 'alerts:read'],
    models: {
        AlertRule: AlertRuleSchema
    },

    exec: async (nango) => {
        // Full refresh: the workflows endpoint has no modified-since filter (dateUpdated
        // is present on each record but cannot be filtered by), so every run walks the
        // complete dataset inside a trackDeletesStart/trackDeletesEnd window.

        // https://docs.sentry.io/api/users/list-your-organizations/
        const orgsResponse = await nango.get({
            endpoint: '/0/organizations/',
            retries: 3
        });

        // A Sentry API token is scoped to a single organization, so the first
        // (and normally only) entry is the organization to sync alert rules for.
        const organizations = z.array(OrganizationSchema).parse(orgsResponse.data);
        const organization = organizations[0];

        if (!organization) {
            throw new Error('No Sentry organization is associated with this connection');
        }

        await nango.trackDeletesStart('AlertRule');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.sentry.io/api/monitors/fetch-alerts/
            endpoint: `/0/organizations/${encodeURIComponent(organization.slug)}/workflows/`,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            if (page.length === 0) {
                // Sentry always returns a rel="next" link; an empty page means the crawl is done
                break;
            }

            const alertRules = page.map((workflow) => AlertRuleSchema.parse(workflow));
            await nango.batchSave(alertRules, 'AlertRule');
        }

        await nango.trackDeletesEnd('AlertRule');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
