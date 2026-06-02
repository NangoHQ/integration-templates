import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the list to create. Example: "Newsletter Subscribers"'),
    stringid: z.string().describe('URL-safe list name. Example: "newsletter-subscribers"'),
    sender_url: z.string().describe('The website URL this list is for. Example: "https://example.com"'),
    sender_reminder: z.string().describe('A reminder for contacts as to why they are on this list. Example: "You subscribed via our website."'),
    channel: z.string().optional().describe('Type of channel for the list. Possible values are `email` or `sms`. Defaults to `email`.'),
    send_last_broadcast: z.boolean().optional().describe('Whether to send the last sent campaign to a new subscriber upon subscribing.'),
    carboncopy: z.string().optional().describe('Comma-separated list of email addresses to copy on all mailings.'),
    subscription_notify: z.string().optional().describe('Comma-separated list of email addresses to notify when a new subscriber joins.'),
    unsubscription_notify: z.string().optional().describe('Comma-separated list of email addresses to notify when a subscriber unsubscribes.'),
    user: z.number().int().optional().describe('User ID of the list owner.')
});

const ProviderLinksSchema = z.object({
    contactGoalLists: z.string().optional(),
    user: z.string().optional(),
    addressLists: z.string().optional()
});

const ProviderListSchema = z.object({
    name: z.string(),
    stringid: z.string(),
    channel: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    links: ProviderLinksSchema.optional(),
    id: z.string()
});

const ProviderResponseSchema = z.object({
    list: ProviderListSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    stringid: z.string(),
    channel: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    links: ProviderLinksSchema.optional()
});

const action = createAction({
    description: 'Create a list in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            list: {
                name: input.name,
                stringid: input.stringid,
                sender_url: input.sender_url,
                sender_reminder: input.sender_reminder,
                ...(input.channel !== undefined && { channel: input.channel }),
                ...(input.send_last_broadcast !== undefined && { send_last_broadcast: input.send_last_broadcast ? 1 : 0 }),
                ...(input.carboncopy !== undefined && { carboncopy: input.carboncopy }),
                ...(input.subscription_notify !== undefined && { subscription_notify: input.subscription_notify }),
                ...(input.unsubscription_notify !== undefined && { unsubscription_notify: input.unsubscription_notify }),
                ...(input.user !== undefined && { user: input.user })
            }
        };

        // https://developers.activecampaign.com/reference/create-new-list
        const response = await nango.post({
            endpoint: '/3/lists',
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.list.id,
            name: providerResponse.list.name,
            stringid: providerResponse.list.stringid,
            ...(providerResponse.list.channel !== undefined && { channel: providerResponse.list.channel }),
            ...(providerResponse.list.cdate !== undefined && { cdate: providerResponse.list.cdate }),
            ...(providerResponse.list.udate !== undefined && { udate: providerResponse.list.udate }),
            ...(providerResponse.list.links !== undefined && { links: providerResponse.list.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
