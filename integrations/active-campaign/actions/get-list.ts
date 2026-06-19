import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('List ID. Example: 3')
});

const ListSchema = z.object({
    id: z.string(),
    stringid: z.string().optional(),
    userid: z.string().optional(),
    name: z.string().optional(),
    cdate: z.string().optional(),
    p_use_tracking: z.string().optional(),
    p_use_analytics_read: z.string().optional(),
    p_use_analytics_link: z.string().optional(),
    p_use_twitter: z.string().optional(),
    p_use_facebook: z.string().optional(),
    p_embed_image: z.string().optional(),
    p_use_captcha: z.string().optional(),
    send_last_broadcast: z.string().optional(),
    private: z.string().optional(),
    analytics_domains: z.string().nullable().optional(),
    analytics_source: z.string().optional(),
    analytics_ua: z.string().optional(),
    twitter_token: z.string().optional(),
    twitter_token_secret: z.string().optional(),
    facebook_session: z.string().nullable().optional(),
    carboncopy: z.string().nullable().optional(),
    subscription_notify: z.string().nullable().optional(),
    unsubscription_notify: z.string().nullable().optional(),
    require_name: z.string().optional(),
    get_unsubscribe_reason: z.string().optional(),
    to_name: z.string().optional(),
    optinoptout: z.string().optional(),
    sender_name: z.string().optional(),
    sender_addr1: z.string().optional(),
    sender_addr2: z.string().optional(),
    sender_city: z.string().optional(),
    sender_state: z.string().optional(),
    sender_zip: z.string().optional(),
    sender_country: z.string().optional(),
    sender_phone: z.string().optional(),
    sender_url: z.string().optional(),
    sender_reminder: z.string().optional(),
    fulladdress: z.string().optional(),
    optinmessageid: z.string().optional(),
    optoutconf: z.string().optional(),
    deletestamp: z.string().nullable().optional(),
    udate: z.string().nullable().optional(),
    links: z
        .object({
            contactGoalLists: z.string().optional(),
            user: z.string().optional(),
            addressLists: z.string().optional()
        })
        .optional(),
    user: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    stringid: z.string().optional(),
    userid: z.string().optional(),
    name: z.string().optional(),
    cdate: z.string().optional(),
    p_use_tracking: z.string().optional(),
    p_use_analytics_read: z.string().optional(),
    p_use_analytics_link: z.string().optional(),
    p_use_twitter: z.string().optional(),
    p_use_facebook: z.string().optional(),
    p_embed_image: z.string().optional(),
    p_use_captcha: z.string().optional(),
    send_last_broadcast: z.string().optional(),
    private: z.string().optional(),
    analytics_domains: z.string().optional(),
    analytics_source: z.string().optional(),
    analytics_ua: z.string().optional(),
    twitter_token: z.string().optional(),
    twitter_token_secret: z.string().optional(),
    facebook_session: z.string().optional(),
    carboncopy: z.string().optional(),
    subscription_notify: z.string().optional(),
    unsubscription_notify: z.string().optional(),
    require_name: z.string().optional(),
    get_unsubscribe_reason: z.string().optional(),
    to_name: z.string().optional(),
    optinoptout: z.string().optional(),
    sender_name: z.string().optional(),
    sender_addr1: z.string().optional(),
    sender_addr2: z.string().optional(),
    sender_city: z.string().optional(),
    sender_state: z.string().optional(),
    sender_zip: z.string().optional(),
    sender_country: z.string().optional(),
    sender_phone: z.string().optional(),
    sender_url: z.string().optional(),
    sender_reminder: z.string().optional(),
    fulladdress: z.string().optional(),
    optinmessageid: z.string().optional(),
    optoutconf: z.string().optional(),
    deletestamp: z.string().optional(),
    udate: z.string().optional(),
    links: z
        .object({
            contactGoalLists: z.string().optional(),
            user: z.string().optional(),
            addressLists: z.string().optional()
        })
        .optional(),
    user: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single list from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list_view'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-a-list
            endpoint: `/3/lists/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'List not found',
                id: input.id
            });
        }

        const data = response.data;
        if (typeof data !== 'object' || data === null || !('list' in data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'List not found',
                id: input.id
            });
        }

        const providerList = ListSchema.parse(data.list);

        return {
            id: providerList.id,
            ...(providerList.stringid !== undefined && { stringid: providerList.stringid }),
            ...(providerList.userid !== undefined && { userid: providerList.userid }),
            ...(providerList.name !== undefined && { name: providerList.name }),
            ...(providerList.cdate !== undefined && { cdate: providerList.cdate }),
            ...(providerList.p_use_tracking !== undefined && { p_use_tracking: providerList.p_use_tracking }),
            ...(providerList.p_use_analytics_read !== undefined && { p_use_analytics_read: providerList.p_use_analytics_read }),
            ...(providerList.p_use_analytics_link !== undefined && { p_use_analytics_link: providerList.p_use_analytics_link }),
            ...(providerList.p_use_twitter !== undefined && { p_use_twitter: providerList.p_use_twitter }),
            ...(providerList.p_use_facebook !== undefined && { p_use_facebook: providerList.p_use_facebook }),
            ...(providerList.p_embed_image !== undefined && { p_embed_image: providerList.p_embed_image }),
            ...(providerList.p_use_captcha !== undefined && { p_use_captcha: providerList.p_use_captcha }),
            ...(providerList.send_last_broadcast !== undefined && { send_last_broadcast: providerList.send_last_broadcast }),
            ...(providerList.private !== undefined && { private: providerList.private }),
            ...(providerList.analytics_domains !== undefined &&
                providerList.analytics_domains !== null && { analytics_domains: providerList.analytics_domains }),
            ...(providerList.analytics_source !== undefined && { analytics_source: providerList.analytics_source }),
            ...(providerList.analytics_ua !== undefined && { analytics_ua: providerList.analytics_ua }),
            ...(providerList.twitter_token !== undefined && { twitter_token: providerList.twitter_token }),
            ...(providerList.twitter_token_secret !== undefined && { twitter_token_secret: providerList.twitter_token_secret }),
            ...(providerList.facebook_session !== undefined && providerList.facebook_session !== null && { facebook_session: providerList.facebook_session }),
            ...(providerList.carboncopy !== undefined && providerList.carboncopy !== null && { carboncopy: providerList.carboncopy }),
            ...(providerList.subscription_notify !== undefined &&
                providerList.subscription_notify !== null && { subscription_notify: providerList.subscription_notify }),
            ...(providerList.unsubscription_notify !== undefined &&
                providerList.unsubscription_notify !== null && { unsubscription_notify: providerList.unsubscription_notify }),
            ...(providerList.require_name !== undefined && { require_name: providerList.require_name }),
            ...(providerList.get_unsubscribe_reason !== undefined && { get_unsubscribe_reason: providerList.get_unsubscribe_reason }),
            ...(providerList.to_name !== undefined && { to_name: providerList.to_name }),
            ...(providerList.optinoptout !== undefined && { optinoptout: providerList.optinoptout }),
            ...(providerList.sender_name !== undefined && { sender_name: providerList.sender_name }),
            ...(providerList.sender_addr1 !== undefined && { sender_addr1: providerList.sender_addr1 }),
            ...(providerList.sender_addr2 !== undefined && { sender_addr2: providerList.sender_addr2 }),
            ...(providerList.sender_city !== undefined && { sender_city: providerList.sender_city }),
            ...(providerList.sender_state !== undefined && { sender_state: providerList.sender_state }),
            ...(providerList.sender_zip !== undefined && { sender_zip: providerList.sender_zip }),
            ...(providerList.sender_country !== undefined && { sender_country: providerList.sender_country }),
            ...(providerList.sender_phone !== undefined && { sender_phone: providerList.sender_phone }),
            ...(providerList.sender_url !== undefined && { sender_url: providerList.sender_url }),
            ...(providerList.sender_reminder !== undefined && { sender_reminder: providerList.sender_reminder }),
            ...(providerList.fulladdress !== undefined && { fulladdress: providerList.fulladdress }),
            ...(providerList.optinmessageid !== undefined && { optinmessageid: providerList.optinmessageid }),
            ...(providerList.optoutconf !== undefined && { optoutconf: providerList.optoutconf }),
            ...(providerList.deletestamp !== undefined && providerList.deletestamp !== null && { deletestamp: providerList.deletestamp }),
            ...(providerList.udate !== undefined && providerList.udate !== null && { udate: providerList.udate }),
            ...(providerList.links !== undefined && { links: providerList.links }),
            ...(providerList.user !== undefined && { user: providerList.user })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
