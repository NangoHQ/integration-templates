import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('The ID of the user whose notification rule to retrieve.'),
        notification_rule_id: z.string().describe('The ID of the notification rule to retrieve.')
    })
    .describe('Input to retrieve a single notification rule for a user.');

const ProviderContactMethodSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional()
});

const ProviderNotificationRuleSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    start_delay_in_minutes: z.number(),
    contact_method: ProviderContactMethodSchema,
    urgency: z.string().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ContactMethodSchema = z.object({
    id: z.string().describe('The ID of the contact method.'),
    type: z.string().describe('The type of the contact method, e.g. email_contact_method.'),
    summary: z.string().optional().describe('A summary description of the contact method.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the notification rule.'),
        type: z.string().describe('The type of the notification rule, e.g. assignment_notification_rule or incident_notification_rule.'),
        summary: z.string().optional().describe('A summary description of the notification rule.'),
        start_delay_in_minutes: z.number().describe('The number of minutes to delay before sending the notification.'),
        contact_method: ContactMethodSchema.describe('The contact method used by this notification rule.'),
        urgency: z.string().optional().describe('The urgency level for this notification rule, e.g. high or low.'),
        self: z.string().optional().describe('The API URL of the notification rule.'),
        html_url: z.string().optional().describe('The web UI URL of the notification rule.')
    })
    .describe('A single notification rule for a user.');

/**
 * @tags: [read]
 * @tagReason: Reads a single notification rule for a user from the PagerDuty API.
 */
const action = createAction({
    description: 'Retrieve a single notification rule for a user.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:contact_methods.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1users~1%7Bid%7D~1notification_rules~1%7Bnotification_rule_id%7D/get
        const response = await nango.get({
            endpoint: `/users/${encodeURIComponent(input.user_id)}/notification_rules/${encodeURIComponent(input.notification_rule_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Notification rule not found or invalid response from provider.'
            });
        }

        const data = response.data;
        const rule = 'notification_rule' in data ? data['notification_rule'] : undefined;

        if (!rule || typeof rule !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Notification rule not found in provider response.'
            });
        }

        const providerRule = ProviderNotificationRuleSchema.parse(rule);

        return {
            id: providerRule.id,
            type: providerRule.type,
            ...(providerRule.summary != null && { summary: providerRule.summary }),
            start_delay_in_minutes: providerRule.start_delay_in_minutes,
            contact_method: {
                id: providerRule.contact_method.id,
                type: providerRule.contact_method.type,
                ...(providerRule.contact_method.summary != null && { summary: providerRule.contact_method.summary })
            },
            ...(providerRule.urgency !== undefined && { urgency: providerRule.urgency }),
            ...(providerRule.self != null && { self: providerRule.self }),
            ...(providerRule.html_url !== undefined && providerRule.html_url !== null && { html_url: providerRule.html_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
