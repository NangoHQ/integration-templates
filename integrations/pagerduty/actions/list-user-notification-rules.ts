import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('PagerDuty user ID. Example: "PJB72P3"')
    })
    .describe("Input for listing a user's notification rules.");

const ContactMethodReferenceSchema = z.object({
    id: z.string().describe('Contact method ID.'),
    type: z.string().describe('Contact method type. Example: "email_contact_method_reference"'),
    summary: z.string().optional().describe('Human-readable summary of the contact method.'),
    self: z.string().optional().describe('API URL of the contact method resource.'),
    html_url: z.string().optional().describe('PagerDuty web URL of the contact method.')
});

const NotificationRuleSchema = z.object({
    id: z.string().describe('Notification rule ID.'),
    type: z.string().describe('Notification rule type. Example: "assignment_notification_rule"'),
    start_delay_in_minutes: z.number().optional().describe('Minutes to wait before notifying.'),
    contact_method: ContactMethodReferenceSchema.optional().describe('Contact method used for this notification rule.'),
    urgency: z.string().optional().describe('Urgency this rule applies to. Example: "high" or "low".'),
    notify_on: z.string().optional().describe('When to notify. Example: "high", "low", or "all".')
});

const OutputSchema = z
    .object({
        total: z.number().describe('Total number of notification rules for the user.'),
        notification_rules: z.array(NotificationRuleSchema).describe("List of the user's notification rules.")
    })
    .describe("Output containing a user's notification rules and total count.");

/**
 * @tags: [read]
 * @tagReason: Retrieves a user\'s notification rules via a GET request.
 * @pitfalls: This endpoint returns all results in a single non-paginated response with no limit, offset, or more fields.
 */
const action = createAction({
    description: "List a user's notification rules (how/when they get notified of assignments).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1users~1%7Bid%7D~1notification_rules/get
            endpoint: `/users/${encodeURIComponent(input.user_id)}/notification_rules`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from PagerDuty API.'
            });
        }

        const total = typeof raw.total === 'number' ? raw.total : 0;
        const rules = Array.isArray(raw.notification_rules) ? raw.notification_rules : [];

        const parsedRules = rules
            .map((rule: unknown) => {
                if (!rule || typeof rule !== 'object') {
                    return null;
                }
                const contactMethod = 'contact_method' in rule ? rule['contact_method'] : undefined;
                const parsedRule: z.infer<typeof NotificationRuleSchema> = {
                    id: String('id' in rule ? rule['id'] : ''),
                    type: String('type' in rule ? rule['type'] : '')
                };
                if ('start_delay_in_minutes' in rule && typeof rule['start_delay_in_minutes'] === 'number') {
                    parsedRule.start_delay_in_minutes = rule['start_delay_in_minutes'];
                }
                if (contactMethod && typeof contactMethod === 'object') {
                    parsedRule.contact_method = parseContactMethod(contactMethod);
                }
                if ('urgency' in rule && typeof rule['urgency'] === 'string') {
                    parsedRule.urgency = rule['urgency'];
                }
                if ('notify_on' in rule && typeof rule['notify_on'] === 'string') {
                    parsedRule.notify_on = rule['notify_on'];
                }
                return parsedRule;
            })
            .filter((item: z.infer<typeof NotificationRuleSchema> | null): item is z.infer<typeof NotificationRuleSchema> => item !== null);

        return {
            total,
            notification_rules: parsedRules
        };
    }
});

function parseContactMethod(raw: unknown): z.infer<typeof ContactMethodReferenceSchema> {
    if (!raw || typeof raw !== 'object') {
        return { id: '', type: '' };
    }
    const result: z.infer<typeof ContactMethodReferenceSchema> = {
        id: String('id' in raw ? raw['id'] : ''),
        type: String('type' in raw ? raw['type'] : '')
    };
    if ('summary' in raw && typeof raw['summary'] === 'string') {
        result.summary = raw['summary'];
    }
    if ('self' in raw && typeof raw['self'] === 'string') {
        result.self = raw['self'];
    }
    if ('html_url' in raw && typeof raw['html_url'] === 'string') {
        result.html_url = raw['html_url'];
    }
    return result;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
