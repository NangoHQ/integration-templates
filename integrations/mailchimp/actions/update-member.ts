import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "16ed227135"'),
    subscriber_hash: z
        .string()
        .describe('The MD5 hash of the lowercase version of the list member\'s email address. Example: "0f8c53293177b8e9f1658ae7951a468e"'),
    email_address: z.string().optional().describe('Email address for a subscriber.'),
    email_type: z.string().optional().describe('Type of email this member asked to get ("html" or "text").'),
    status: z.enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional']).optional().describe("Subscriber's current status."),
    merge_fields: z.record(z.string(), z.unknown()).optional().describe('An individual merge var and value for a member.'),
    interests: z.record(z.string(), z.boolean()).optional().describe("The key of this object's properties is the ID of the interest in question."),
    language: z.string().optional().describe("If set/detected, the subscriber's language."),
    vip: z.boolean().optional().describe('VIP status for subscriber.'),
    location: z
        .object({
            latitude: z.number().optional(),
            longitude: z.number().optional(),
            gmtoff: z.number().optional(),
            dstoff: z.number().optional(),
            country_code: z.string().optional(),
            timezone: z.string().optional(),
            region: z.string().optional()
        })
        .optional()
        .describe('Subscriber location information.'),
    ip_signup: z.string().optional().describe('IP address the subscriber signed up from.'),
    timestamp_signup: z.string().optional().describe('The date and time the subscriber signed up for the list in ISO 8601 format.'),
    ip_opt: z.string().optional().describe('The IP address the subscriber used to confirm their opt-in status.'),
    timestamp_opt: z.string().optional().describe('The date and time the subscriber confirmed their opt-in status in ISO 8601 format.')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    email_address: z.string(),
    unique_email_id: z.string().optional(),
    contact_id: z.string().optional(),
    full_name: z.string().optional(),
    web_id: z.number().optional(),
    email_type: z.string().optional(),
    status: z.string(),
    merge_fields: z.record(z.string(), z.unknown()).optional(),
    interests: z.record(z.string(), z.boolean()).optional(),
    stats: z
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
        .optional(),
    ip_signup: z.string().optional(),
    timestamp_signup: z.string().optional(),
    ip_opt: z.string().optional(),
    timestamp_opt: z.string().optional(),
    member_rating: z.number().optional(),
    last_changed: z.string().optional(),
    language: z.string().optional(),
    vip: z.boolean().optional(),
    email_client: z.string().optional(),
    location: z
        .object({
            latitude: z.number().optional(),
            longitude: z.number().optional(),
            gmtoff: z.number().optional(),
            dstoff: z.number().optional(),
            country_code: z.string().optional(),
            timezone: z.string().optional(),
            region: z.string().optional()
        })
        .optional(),
    source: z.string().optional(),
    tags_count: z.number().optional(),
    tags: z
        .array(
            z.object({
                id: z.number(),
                name: z.string()
            })
        )
        .optional(),
    list_id: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    email_address: z.string(),
    status: z.string(),
    list_id: z.string(),
    vip: z.boolean().optional(),
    language: z.string().optional(),
    merge_fields: z.record(z.string(), z.unknown()).optional(),
    last_changed: z.string().optional()
});

const action = createAction({
    description: 'Update a member in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://mailchimp.com/developer/marketing/api/list-members/update-list-member/
        const response = await nango.patch({
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/members/${encodeURIComponent(input.subscriber_hash)}`,
            data: {
                ...(input.email_address !== undefined && { email_address: input.email_address }),
                ...(input.email_type !== undefined && { email_type: input.email_type }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.merge_fields !== undefined && { merge_fields: input.merge_fields }),
                ...(input.interests !== undefined && { interests: input.interests }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.vip !== undefined && { vip: input.vip }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.ip_signup !== undefined && { ip_signup: input.ip_signup }),
                ...(input.timestamp_signup !== undefined && { timestamp_signup: input.timestamp_signup }),
                ...(input.ip_opt !== undefined && { ip_opt: input.ip_opt }),
                ...(input.timestamp_opt !== undefined && { timestamp_opt: input.timestamp_opt })
            },
            retries: 10
        });

        const member = ProviderMemberSchema.parse(response.data);

        return {
            id: member.id,
            email_address: member.email_address,
            status: member.status,
            list_id: member.list_id,
            ...(member.vip !== undefined && { vip: member.vip }),
            ...(member.language !== undefined && { language: member.language }),
            ...(member.merge_fields !== undefined && { merge_fields: member.merge_fields }),
            ...(member.last_changed !== undefined && { last_changed: member.last_changed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
