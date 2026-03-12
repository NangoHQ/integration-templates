import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email_id: z.string().describe('The ID of the marketing email to update. Example: "123456789"'),
    name: z.string().optional().describe('The name of the marketing email.'),
    subject: z.string().optional().describe('The subject line of the marketing email.'),
    html: z.string().optional().describe('The HTML content of the marketing email.'),
    from_email: z.string().optional().describe('The from email address.'),
    from_name: z.string().optional().describe('The from name.'),
    reply_to: z.string().optional().describe('The reply-to email address.'),
    preview_text: z.string().optional().describe('The preview text for the email.')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    subject: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
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
        if (input.from_email) properties['from.email'] = input.from_email;
        if (input.from_name) properties['from.name'] = input.from_name;
        if (input.reply_to) properties['replyTo'] = input.reply_to;
        if (input.preview_text) properties['previewText'] = input.preview_text;

        const response = await nango.patch({
            // https://developers.hubspot.com/docs/api-reference/marketing-marketing-emails-v3/marketing-emails/patch-marketing-v3-emails-emailId
            endpoint: `/marketing/v3/emails/${input.email_id}`,
            data: { properties },
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            name: data.name ?? null,
            subject: data.subject ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
