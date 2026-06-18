import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "a1b2c3d4e5"')
});

const ContactSchema = z
    .object({
        company: z.string().optional(),
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional()
    })
    .passthrough();

const CampaignDefaultsSchema = z
    .object({
        from_name: z.string().optional(),
        from_email: z.string().optional(),
        subject: z.string().optional(),
        language: z.string().optional()
    })
    .passthrough();

const StatsSchema = z
    .object({
        member_count: z.number().optional(),
        total_contacts: z.number().optional(),
        unsubscribe_count: z.number().optional(),
        cleaned_count: z.number().optional(),
        member_count_since_send: z.number().optional(),
        unsubscribe_count_since_send: z.number().optional(),
        cleaned_count_since_send: z.number().optional(),
        campaign_count: z.number().optional(),
        campaign_last_sent: z.string().optional(),
        merge_field_count: z.number().optional(),
        avg_sub_rate: z.number().optional(),
        avg_unsub_rate: z.number().optional(),
        target_sub_rate: z.number().optional(),
        open_rate: z.number().optional(),
        click_rate: z.number().optional(),
        last_sub_date: z.string().optional(),
        last_unsub_date: z.string().optional()
    })
    .passthrough();

const LinkSchema = z
    .object({
        rel: z.string().optional(),
        href: z.string().optional(),
        method: z.string().optional(),
        targetSchema: z.string().optional(),
        schema: z.string().optional()
    })
    .passthrough();

const ProviderListSchema = z
    .object({
        id: z.string(),
        web_id: z.number().optional(),
        name: z.string().optional(),
        contact: ContactSchema.optional(),
        permission_reminder: z.string().optional(),
        use_archive_bar: z.boolean().optional(),
        campaign_defaults: CampaignDefaultsSchema.optional(),
        notify_on_subscribe: z.string().optional(),
        notify_on_unsubscribe: z.string().optional(),
        date_created: z.string().optional(),
        list_rating: z.number().optional(),
        subscribe_url_short: z.string().optional(),
        subscribe_url_long: z.string().optional(),
        beamer_address: z.string().optional(),
        visibility: z.string().optional(),
        double_optin: z.boolean().optional(),
        use_custom_footer: z.boolean().optional(),
        forwards: z.object({}).passthrough().optional(),
        facebook_page: z.string().optional(),
        rss_url: z.string().optional(),
        rss_email: z.object({}).passthrough().optional(),
        twitter_handle: z.string().optional(),
        vip: z.boolean().optional(),
        modules: z.array(z.unknown()).optional(),
        stats: StatsSchema.optional(),
        _links: z.array(LinkSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single audience from Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: ProviderListSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof ProviderListSchema>> => {
        const response = await nango.get({
            // https://mailchimp.com/developer/marketing/api/lists/get-list-info/
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}`,
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
        return providerList;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
