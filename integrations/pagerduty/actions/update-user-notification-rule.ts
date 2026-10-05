import { z } from 'zod';
import { createAction } from 'nango';

const ContactMethodInputSchema = z
    .object({
        id: z.string().describe('ID of the contact method to associate.'),
        type: z.string().describe('Type of the contact method, e.g. email_contact_method.')
    })
    .describe('Contact method to associate with the notification rule.');

const InputSchema = z
    .object({
        user_id: z.string().describe('PagerDuty user ID containing the notification rule.'),
        notification_rule_id: z.string().describe('ID of the notification rule to update.'),
        type: z.string().describe('Notification rule type (e.g. assignment_notification_rule). Required even if unchanged.'),
        start_delay_in_minutes: z.number().optional().describe('Minutes to delay before notifying.'),
        urgency: z.string().optional().describe('Urgency level (e.g. high or low).'),
        contact_method: ContactMethodInputSchema.optional().describe('Contact method to attach to the rule.')
    })
    .describe('Input to update an existing PagerDuty user notification rule.');

const ProviderContactMethodSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    address: z.string().nullable().optional()
});

const ProviderNotificationRuleSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    start_delay_in_minutes: z.number(),
    urgency: z.string(),
    contact_method: z.union([ProviderContactMethodSchema, z.null()]).optional()
});

const ProviderResponseSchema = z.object({
    notification_rule: ProviderNotificationRuleSchema
});

const ContactMethodOutputSchema = z
    .object({
        id: z.string().describe('Contact method ID.'),
        type: z.string().describe('Contact method type.'),
        summary: z.string().optional().describe('Summary of the contact method.'),
        label: z.string().optional().describe('Label of the contact method.'),
        address: z.string().optional().describe('Address of the contact method (e.g. email).')
    })
    .describe('Contact method returned as part of the updated notification rule.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the notification rule.'),
        type: z.string().describe('Type of notification rule.'),
        summary: z.string().optional().describe('Summary description of the rule.'),
        start_delay_in_minutes: z.number().describe('Number of minutes to delay before sending the notification.'),
        urgency: z.string().describe('Urgency level (e.g. high or low).'),
        contact_method: ContactMethodOutputSchema.optional().describe('Contact method used for this notification rule.')
    })
    .describe('Result of updating a PagerDuty user notification rule.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing PagerDuty user notification rule via PUT.
 * @pitfalls: The notification_rule type must be included on every update even when unchanged.
 */
const action = createAction({
    description: 'Update an existing notification rule.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:contact_methods.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            notification_rule: {
                type: input.type,
                ...(input.start_delay_in_minutes !== undefined && {
                    start_delay_in_minutes: input.start_delay_in_minutes
                }),
                ...(input.urgency !== undefined && { urgency: input.urgency }),
                ...(input.contact_method !== undefined && {
                    contact_method: {
                        id: input.contact_method.id,
                        type: input.contact_method.type
                    }
                })
            }
        };

        // https://developer.pagerduty.com/api-reference/7e1f7724435e2-update-a-user-s-notification-rule
        const response = await nango.put({
            endpoint: `/users/${encodeURIComponent(input.user_id)}/notification_rules/${encodeURIComponent(input.notification_rule_id)}`,
            data: body,
            retries: 1
        });

        if (response.status !== 200 || !response.data) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update notification rule.',
                status: response.status
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const rule = parsed.notification_rule;

        return {
            id: rule.id,
            type: rule.type,
            ...(rule.summary != null && { summary: rule.summary }),
            start_delay_in_minutes: rule.start_delay_in_minutes,
            urgency: rule.urgency,
            ...(rule.contact_method != null && {
                contact_method: {
                    id: rule.contact_method.id,
                    type: rule.contact_method.type,
                    ...(rule.contact_method.summary != null && {
                        summary: rule.contact_method.summary
                    }),
                    ...(rule.contact_method.label != null && {
                        label: rule.contact_method.label
                    }),
                    ...(rule.contact_method.address != null && {
                        address: rule.contact_method.address
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
