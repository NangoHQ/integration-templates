import { createHash } from 'crypto';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "16ed227135"'),
    email: z
        .string()
        .email()
        .describe('The email address of the member to retrieve. The subscriber hash will be computed automatically. Example: "user@example.com"')
});

const ProviderMemberStatsSchema = z
    .object({
        avg_open_rate: z.number().optional(),
        avg_click_rate: z.number().optional(),
        ecommerce_data: z
            .object({
                total_revenue: z.number().optional(),
                number_of_orders: z.number().optional(),
                currency_code: z.string().optional()
            })
            .optional()
    })
    .optional();

const ProviderMemberLocationSchema = z
    .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        gmtoff: z.number().optional(),
        dstoff: z.number().optional(),
        country_code: z.string().optional(),
        timezone: z.string().optional(),
        region: z.string().optional()
    })
    .optional();

const ProviderMarketingPermissionSchema = z.object({
    marketing_permission_id: z.string().optional(),
    text: z.string().optional(),
    enabled: z.boolean().optional()
});

const ProviderLastNoteSchema = z
    .object({
        note_id: z.number().optional(),
        created_at: z.string().optional(),
        created_by: z.string().optional(),
        note: z.string().optional()
    })
    .optional();

const ProviderTagSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const ProviderLinkSchema = z.object({
    rel: z.string().optional(),
    href: z.string().optional(),
    method: z.string().optional(),
    targetSchema: z.string().optional(),
    schema: z.string().optional()
});

const ProviderMemberSchema = z
    .object({
        id: z.string().optional(),
        email_address: z.string().optional(),
        unique_email_id: z.string().optional(),
        contact_id: z.string().optional(),
        full_name: z.string().optional(),
        web_id: z.number().optional(),
        email_type: z.string().optional(),
        status: z.string().optional(),
        unsubscribe_reason: z.string().optional(),
        consents_to_one_to_one_messaging: z.boolean().optional(),
        sms_phone_number: z.string().optional(),
        sms_subscription_status: z.string().optional(),
        sms_subscription_last_updated: z.string().optional(),
        merge_fields: z.record(z.string(), z.unknown()).optional(),
        interests: z.record(z.string(), z.unknown()).optional(),
        stats: ProviderMemberStatsSchema,
        ip_signup: z.string().optional(),
        timestamp_signup: z.string().optional(),
        ip_opt: z.string().optional(),
        timestamp_opt: z.string().optional(),
        member_rating: z.union([z.number(), z.string()]).optional(),
        last_changed: z.string().optional(),
        language: z.string().optional(),
        vip: z.boolean().optional(),
        email_client: z.string().optional(),
        location: ProviderMemberLocationSchema,
        marketing_permissions: z.array(ProviderMarketingPermissionSchema).optional(),
        last_note: ProviderLastNoteSchema,
        source: z.string().optional(),
        tags_count: z.number().optional(),
        tags: z.array(ProviderTagSchema).optional(),
        list_id: z.string().optional(),
        _links: z.array(ProviderLinkSchema).optional()
    })
    .passthrough();

const OutputSchema = ProviderMemberSchema;

const action = createAction({
    description: 'Retrieve a single member from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-member',
        group: 'Members'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const subscriberHash = createHash('md5').update(input.email.toLowerCase()).digest('hex');

        const response = await nango.get({
            // https://mailchimp.com/developer/marketing/api/list-members/get-member-info/
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/members/${encodeURIComponent(subscriberHash)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Member not found',
                list_id: input.list_id,
                email: input.email
            });
        }

        const member = ProviderMemberSchema.parse(response.data);

        return member;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
