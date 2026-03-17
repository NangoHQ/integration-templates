import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emailId: z.string().describe('The ID of the marketing email to update. Example: "123456789"'),
    name: z.string().optional().describe('The name of the marketing email.'),
    subject: z.string().optional().describe('The subject line of the marketing email.'),
    html: z.string().optional().describe('The HTML content of the marketing email.'),
    fromEmail: z.string().optional().describe('The from email address.'),
    fromName: z.string().optional().describe('The from name.'),
    replyTo: z.string().optional().describe('The reply-to email address.'),
    previewText: z.string().optional().describe('The preview text for the email.')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    subject: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Update a marketing email',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-marketing-email',
        group: 'Marketing Emails'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['content', 'crm.objects.marketing_events.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build properties object following HubSpot pattern
        const properties: Record<string, string> = {};

        if (input.name) properties['name'] = input.name;
        if (input.subject) properties['subject'] = input.subject;
        if (input.html) properties['html'] = input.html;
        if (input.fromEmail) properties['from.email'] = input.fromEmail;
        if (input.fromName) properties['from.name'] = input.fromName;
        if (input.replyTo) properties['replyTo'] = input.replyTo;
        if (input.previewText) properties['previewText'] = input.previewText;

        const response = await nango.patch({
            // https://developers.hubspot.com/docs/api-reference/marketing-marketing-emails-v3/marketing-emails/patch-marketing-v3-emails-emailId
            endpoint: `/marketing/v3/emails/${input.emailId}`,
            data: { properties },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            name: data.name ?? undefined,
            subject: data.subject ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
