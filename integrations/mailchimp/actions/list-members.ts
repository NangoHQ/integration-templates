import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "a1b2c3d4e5"'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    count: z.number().int().min(1).max(1000).optional().describe('The number of records to return. Default is 10. Maximum is 1000.'),
    status: z.enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional']).optional().describe("The subscriber's status."),
    since_timestamp_opt: z
        .string()
        .optional()
        .describe('Restrict results to subscribers who opted-in after the set timeframe. Uses ISO 8601 time format: 2015-10-21T15:41:36+00:00.'),
    before_timestamp_opt: z
        .string()
        .optional()
        .describe('Restrict results to subscribers who opted-in before the set timeframe. Uses ISO 8601 time format: 2015-10-21T15:41:36+00:00.'),
    since_last_changed: z
        .string()
        .optional()
        .describe('Restrict results to subscribers whose information changed after the set timeframe. Uses ISO 8601 time format: 2015-10-21T15:41:36+00:00.'),
    before_last_changed: z
        .string()
        .optional()
        .describe('Restrict results to subscribers whose information changed before the set timeframe. Uses ISO 8601 time format: 2015-10-21T15:41:36+00:00.')
});

const MemberStatsSchema = z.object({
    avg_open_rate: z.number().optional(),
    avg_click_rate: z.number().optional()
});

const MemberTagSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const MemberLocationSchema = z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    gmtoff: z.number().optional(),
    dstoff: z.number().optional(),
    country_code: z.string().optional(),
    timezone: z.string().optional(),
    region: z.string().optional()
});

const MemberSchema = z.object({
    id: z.string(),
    email_address: z.string(),
    unique_email_id: z.string().optional(),
    contact_id: z.string().optional(),
    full_name: z.string().optional(),
    web_id: z.number().optional(),
    email_type: z.string().optional(),
    status: z.string().optional(),
    unsubscribe_reason: z.string().optional(),
    consents_to_one_to_one_messaging: z.boolean().optional(),
    merge_fields: z.record(z.string(), z.unknown()).optional(),
    interests: z.record(z.string(), z.unknown()).optional(),
    stats: MemberStatsSchema.optional(),
    ip_signup: z.string().optional(),
    timestamp_signup: z.string().optional(),
    ip_opt: z.string().optional(),
    timestamp_opt: z.string().optional(),
    member_rating: z.number().optional(),
    last_changed: z.string().optional(),
    language: z.string().optional(),
    vip: z.boolean().optional(),
    email_client: z.string().optional(),
    location: MemberLocationSchema.optional(),
    source: z.string().optional(),
    tags_count: z.number().optional(),
    tags: z.array(MemberTagSchema).optional(),
    list_id: z.string().optional()
});

const ProviderResponseSchema = z.object({
    members: z.array(z.unknown()),
    total_items: z.number().optional(),
    _links: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    members: z.array(MemberSchema),
    next_cursor: z.string().optional(),
    total_items: z.number().optional()
});

const action = createAction({
    description: 'List members from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-members',
        group: 'Members'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? (/^\d+$/.test(input.cursor) ? parseInt(input.cursor, 10) : NaN) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string representing an offset'
            });
        }

        const count = input.count ?? 10;

        // https://mailchimp.com/developer/marketing/api/list-members/
        const response = await nango.get({
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/members`,
            params: {
                count: String(count),
                offset: String(offset),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.since_timestamp_opt !== undefined && { since_timestamp_opt: input.since_timestamp_opt }),
                ...(input.before_timestamp_opt !== undefined && { before_timestamp_opt: input.before_timestamp_opt }),
                ...(input.since_last_changed !== undefined && { since_last_changed: input.since_last_changed }),
                ...(input.before_last_changed !== undefined && { before_last_changed: input.before_last_changed })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const members = providerResponse.members.map((rawMember: unknown) => {
            const parsed = MemberSchema.safeParse(rawMember);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse a member from the provider response',
                    error: parsed.error.message
                });
            }
            return parsed.data;
        });

        const totalItems = providerResponse.total_items ?? 0;
        const nextOffset = offset + count;
        const nextCursor = nextOffset < totalItems ? String(nextOffset) : undefined;

        return {
            members,
            ...(nextCursor !== undefined && { next_cursor: nextCursor }),
            total_items: totalItems
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
