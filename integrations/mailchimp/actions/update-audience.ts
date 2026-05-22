import { z } from 'zod';
import { createAction } from 'nango';

const ContactSchema = z.object({
    company: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional()
});

const CampaignDefaultsSchema = z.object({
    from_name: z.string().optional(),
    from_email: z.string().optional(),
    subject: z.string().optional(),
    language: z.string().optional()
});

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the audience. Example: "a1b2c3d4e5"'),
    name: z.string().optional().describe('The name of the audience.'),
    contact: ContactSchema.optional().describe('The contact information for the audience.'),
    permission_reminder: z.string().optional().describe('The permission reminder for the audience.'),
    campaign_defaults: CampaignDefaultsSchema.optional().describe('The default campaign settings for the audience.'),
    notify_on_subscribe: z.string().optional().describe('The email address to notify when someone subscribes.'),
    notify_on_unsubscribe: z.string().optional().describe('The email address to notify when someone unsubscribes.'),
    email_type_option: z.boolean().optional().describe('Whether subscribers can choose the format of the email.'),
    visibility: z.enum(['pub', 'prv']).optional().describe('The visibility of the audience.')
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact: ContactSchema,
    permission_reminder: z.string(),
    campaign_defaults: CampaignDefaultsSchema,
    notify_on_subscribe: z.string().optional().nullable(),
    notify_on_unsubscribe: z.string().optional().nullable(),
    email_type_option: z.boolean(),
    visibility: z.string().optional().nullable(),
    web_id: z.number().optional(),
    date_created: z.string().optional(),
    list_rating: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact: ContactSchema,
    permission_reminder: z.string(),
    campaign_defaults: CampaignDefaultsSchema,
    notify_on_subscribe: z.string().optional().nullable(),
    notify_on_unsubscribe: z.string().optional().nullable(),
    email_type_option: z.boolean(),
    visibility: z.string().optional().nullable(),
    web_id: z.number().optional(),
    date_created: z.string().optional(),
    list_rating: z.number().optional()
});

const action = createAction({
    description: 'Update an audience in Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-audience',
        group: 'Audiences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            name?: string;
            contact?: z.infer<typeof ContactSchema>;
            permission_reminder?: string;
            campaign_defaults?: z.infer<typeof CampaignDefaultsSchema>;
            notify_on_subscribe?: string;
            notify_on_unsubscribe?: string;
            email_type_option?: boolean;
            visibility?: string;
        } = {};

        if (input.name !== undefined) {
            data.name = input.name;
        }
        if (input.contact !== undefined) {
            data.contact = input.contact;
        }
        if (input.permission_reminder !== undefined) {
            data.permission_reminder = input.permission_reminder;
        }
        if (input.campaign_defaults !== undefined) {
            data.campaign_defaults = input.campaign_defaults;
        }
        if (input.notify_on_subscribe !== undefined) {
            data.notify_on_subscribe = input.notify_on_subscribe;
        }
        if (input.notify_on_unsubscribe !== undefined) {
            data.notify_on_unsubscribe = input.notify_on_unsubscribe;
        }
        if (input.email_type_option !== undefined) {
            data.email_type_option = input.email_type_option;
        }
        if (input.visibility !== undefined) {
            data.visibility = input.visibility;
        }

        // https://mailchimp.com/developer/marketing/api/lists/update-lists/
        const response = await nango.patch({
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}`,
            data,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Audience not found',
                list_id: input.list_id
            });
        }

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            name: providerList.name,
            contact: providerList.contact,
            permission_reminder: providerList.permission_reminder,
            campaign_defaults: providerList.campaign_defaults,
            notify_on_subscribe: providerList.notify_on_subscribe,
            notify_on_unsubscribe: providerList.notify_on_unsubscribe,
            email_type_option: providerList.email_type_option,
            visibility: providerList.visibility,
            web_id: providerList.web_id,
            date_created: providerList.date_created,
            list_rating: providerList.list_rating
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
