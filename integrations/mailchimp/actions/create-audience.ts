import { z } from 'zod';
import { createAction } from 'nango';

const CampaignDefaultsInputSchema = z.object({
    from_name: z.string(),
    from_email: z.string(),
    subject: z.string(),
    language: z.string()
});

const ContactInputSchema = z.object({
    company: z.string(),
    address1: z.string(),
    address2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
    phone: z.string().optional()
});

const InputSchema = z.object({
    name: z.string(),
    contact: ContactInputSchema,
    permission_reminder: z.string(),
    campaign_defaults: CampaignDefaultsInputSchema,
    email_type_option: z.boolean(),
    visibility: z.enum(['pub', 'prv']).optional(),
    notify_on_subscribe: z.string().optional(),
    notify_on_unsubscribe: z.string().optional(),
    use_archive_bar: z.boolean().optional()
});

const CampaignDefaultsSchema = z.object({
    from_name: z.string(),
    from_email: z.string(),
    subject: z.string(),
    language: z.string()
});

const ContactSchema = z.object({
    company: z.string(),
    address1: z.string(),
    address2: z.string().nullable().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
    phone: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact: ContactSchema,
    permission_reminder: z.string(),
    campaign_defaults: CampaignDefaultsSchema,
    email_type_option: z.boolean(),
    visibility: z.string().optional()
});

const action = createAction({
    description: 'Create a audience in Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-audience',
        group: 'Audiences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            name: input.name,
            contact: input.contact,
            permission_reminder: input.permission_reminder,
            campaign_defaults: input.campaign_defaults,
            email_type_option: input.email_type_option
        };

        if (input.visibility !== undefined) {
            payload['visibility'] = input.visibility;
        }
        if (input.notify_on_subscribe !== undefined) {
            payload['notify_on_subscribe'] = input.notify_on_subscribe;
        }
        if (input.notify_on_unsubscribe !== undefined) {
            payload['notify_on_unsubscribe'] = input.notify_on_unsubscribe;
        }
        if (input.use_archive_bar !== undefined) {
            payload['use_archive_bar'] = input.use_archive_bar;
        }

        // https://mailchimp.com/developer/marketing/api/lists/
        const response = await nango.post({
            endpoint: '/3.0/lists',
            data: payload,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Mailchimp did not return a response body.'
            });
        }

        const raw = response.data;
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response format from Mailchimp.'
            });
        }

        const parsed = OutputSchema.parse(raw);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
