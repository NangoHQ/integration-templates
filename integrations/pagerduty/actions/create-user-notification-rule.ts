import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('The ID of the PagerDuty user to add the notification rule to.'),
        start_delay_in_minutes: z.number().int().describe('Minutes to wait after incident assignment before notifying the user.'),
        contact_method: z
            .object({
                id: z.string().describe('The ID of the contact method to use for notifications.'),
                type: z
                    .enum([
                        'email_contact_method',
                        'sms_contact_method',
                        'phone_contact_method',
                        'push_notification_contact_method',
                        'slack_contact_method',
                        'whatsapp_contact_method'
                    ])
                    .describe('The bare contact method type. Must not use the "_reference"-suffixed type used in embeds.')
            })
            .describe('The contact method configuration for this notification rule.'),
        urgency: z.enum(['high', 'low']).describe('The urgency level that triggers this notification rule.')
    })
    .describe('Input for creating a PagerDuty user notification rule.');

const ProviderContactMethodSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    label: z.string().optional(),
    address: z.string().optional(),
    send_short_email: z.boolean().optional(),
    send_html_email: z.boolean().optional(),
    enabled: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    notification_rule: z.object({
        id: z.string(),
        type: z.string(),
        summary: z.string().nullable().optional(),
        self: z.string().nullable().optional(),
        html_url: z.string().nullable().optional(),
        start_delay_in_minutes: z.number().int(),
        contact_method: ProviderContactMethodSchema.optional(),
        urgency: z.string()
    })
});

const OutputContactMethodSchema = z.object({
    id: z.string().describe('The ID of the contact method.'),
    type: z.string().describe('The type of the contact method.'),
    summary: z.string().optional().describe('A summary of the contact method.'),
    self: z.string().optional().describe('API self-reference URL for the contact method.'),
    label: z.string().optional().describe('The display label of the contact method.'),
    address: z.string().optional().describe('The address of the contact method (for example, an email address).'),
    send_short_email: z.boolean().optional().describe('Whether short emails are sent.'),
    send_html_email: z.boolean().optional().describe('Whether HTML emails are sent.'),
    enabled: z.boolean().optional().describe('Whether the contact method is enabled.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the created notification rule.'),
        type: z.string().describe('The type of notification rule (for example, "assignment_notification_rule").'),
        summary: z.string().optional().describe('A summary of the notification rule.'),
        self: z.string().optional().describe('API self-reference URL for the notification rule.'),
        start_delay_in_minutes: z.number().int().describe('The configured start delay in minutes.'),
        contact_method: OutputContactMethodSchema.optional().describe('The contact method used by this rule.'),
        urgency: z.string().describe('The urgency level for this rule.')
    })
    .describe('The created PagerDuty user notification rule.');

/**
 * @tags: [write]
 * @tagReason: Creates a new notification rule on the provider.
 * @pitfalls: The contact_method.type must be the bare type (for example, "email_contact_method") rather than the "_reference"-suffixed type used in embeds, and the provider rejects duplicate start_delay_in_minutes values for the same contact_method.
 */
const action = createAction({
    description: 'Add a new notification rule to a user.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:contact_methods.write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/users/${encodeURIComponent(input.user_id)}/notification_rules`,
            data: {
                notification_rule: {
                    type: 'assignment_notification_rule',
                    start_delay_in_minutes: input.start_delay_in_minutes,
                    contact_method: {
                        id: input.contact_method.id,
                        type: input.contact_method.type
                    },
                    urgency: input.urgency
                }
            },
            retries: 1
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const rule = parsed.notification_rule;

        const contactMethod =
            rule.contact_method != null
                ? {
                      id: rule.contact_method.id,
                      type: rule.contact_method.type,
                      ...(rule.contact_method.summary != null && { summary: rule.contact_method.summary }),
                      ...(rule.contact_method.self != null && { self: rule.contact_method.self }),
                      ...(rule.contact_method.label !== undefined && { label: rule.contact_method.label }),
                      ...(rule.contact_method.address !== undefined && { address: rule.contact_method.address }),
                      ...(rule.contact_method.send_short_email !== undefined && { send_short_email: rule.contact_method.send_short_email }),
                      ...(rule.contact_method.send_html_email !== undefined && { send_html_email: rule.contact_method.send_html_email }),
                      ...(rule.contact_method.enabled !== undefined && { enabled: rule.contact_method.enabled })
                  }
                : undefined;

        return {
            id: rule.id,
            type: rule.type,
            ...(rule.summary != null && { summary: rule.summary }),
            ...(rule.self != null && { self: rule.self }),
            start_delay_in_minutes: rule.start_delay_in_minutes,
            ...(contactMethod !== undefined && { contact_method: contactMethod }),
            urgency: rule.urgency
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
