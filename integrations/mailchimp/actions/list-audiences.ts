import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.'),
    count: z.number().int().min(1).max(1000).optional().describe('Number of records to return. Default is 10. Maximum is 1000.')
});

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

const StatsSchema = z.object({
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
});

const ListSchema = z.object({
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
    email_type_option: z.boolean().optional(),
    double_optin: z.boolean().optional(),
    marketing_permissions: z.boolean().optional(),
    stats: StatsSchema.optional(),
    visibility: z.string().optional()
});

const ProviderResponseSchema = z.object({
    lists: z.array(ListSchema),
    total_items: z.number().optional()
});

const OutputSchema = z.object({
    lists: z.array(ListSchema),
    total_items: z.number().optional(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List audiences from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-audiences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? (/^\d+$/.test(input.cursor) ? parseInt(input.cursor, 10) : NaN) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string representing an offset'
            });
        }
        const count = input.count ?? 10;

        // https://mailchimp.com/developer/marketing/api/lists/get-lists-info/
        const response = await nango.get({
            endpoint: '/3.0/lists',
            params: {
                count: String(count),
                offset: String(offset)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const totalItems = providerResponse.total_items ?? 0;
        const nextOffset = offset + count;
        const nextCursor = nextOffset < totalItems ? String(nextOffset) : undefined;

        return {
            lists: providerResponse.lists,
            total_items: providerResponse.total_items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
