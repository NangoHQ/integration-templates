import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "a1b2c3d4"'),
    email_address: z.string().describe('Email address for the subscriber. Example: "user@example.com"'),
    status: z.enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional']).describe("Subscriber's current status."),
    merge_fields: z.record(z.string(), z.string()).optional().describe('An individual merge var and value for a member.'),
    interests: z.record(z.string(), z.boolean()).optional().describe("The key of this object's properties is the ID of the interest in question."),
    language: z.string().optional().describe("If set/detected, the subscriber's language."),
    vip: z.boolean().optional().describe('VIP status for subscriber.'),
    tags: z.array(z.string()).optional().describe('The tags that are associated with this member.'),
    location: z
        .object({
            latitude: z.number(),
            longitude: z.number()
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
    status: z.string(),
    list_id: z.string().optional(),
    merge_fields: z.record(z.string(), z.unknown()).optional(),
    interests: z.record(z.string(), z.unknown()).optional(),
    vip: z.boolean().optional(),
    language: z.string().optional(),
    timestamp_opt: z.string().optional(),
    timestamp_signup: z.string().optional(),
    ip_opt: z.string().optional(),
    ip_signup: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe("The MD5 hash of the lowercase version of the member's email address."),
    email_address: z.string(),
    status: z.string(),
    unique_email_id: z.string().optional(),
    contact_id: z.string().optional(),
    list_id: z.string().optional(),
    merge_fields: z.record(z.string(), z.unknown()).optional(),
    interests: z.record(z.string(), z.boolean()).optional(),
    vip: z.boolean().optional(),
    language: z.string().optional(),
    timestamp_opt: z.string().optional(),
    timestamp_signup: z.string().optional(),
    ip_opt: z.string().optional(),
    ip_signup: z.string().optional()
});

const action = createAction({
    description: 'Create a member in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://mailchimp.com/developer/marketing/api/list-members/add-member-to-list/
        const response = await nango.post({
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/members`,
            data: {
                email_address: input.email_address,
                status: input.status,
                ...(input.merge_fields !== undefined && { merge_fields: input.merge_fields }),
                ...(input.interests !== undefined && { interests: input.interests }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.vip !== undefined && { vip: input.vip }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.ip_signup !== undefined && { ip_signup: input.ip_signup }),
                ...(input.timestamp_signup !== undefined && { timestamp_signup: input.timestamp_signup }),
                ...(input.ip_opt !== undefined && { ip_opt: input.ip_opt }),
                ...(input.timestamp_opt !== undefined && { timestamp_opt: input.timestamp_opt })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create member: no data returned.'
            });
        }

        const member = ProviderMemberSchema.parse(response.data);

        return {
            id: member.id,
            email_address: member.email_address,
            status: member.status,
            ...(member.unique_email_id !== undefined && { unique_email_id: member.unique_email_id }),
            ...(member.contact_id !== undefined && { contact_id: member.contact_id }),
            ...(member.list_id !== undefined && { list_id: member.list_id }),
            ...(member.merge_fields !== undefined && { merge_fields: member.merge_fields }),
            ...(member.interests !== undefined && {
                interests: Object.fromEntries(Object.entries(member.interests).map(([k, v]) => [k, Boolean(v)]))
            }),
            ...(member.vip !== undefined && { vip: member.vip }),
            ...(member.language !== undefined && { language: member.language }),
            ...(member.timestamp_opt !== undefined && { timestamp_opt: member.timestamp_opt }),
            ...(member.timestamp_signup !== undefined && { timestamp_signup: member.timestamp_signup }),
            ...(member.ip_opt !== undefined && { ip_opt: member.ip_opt }),
            ...(member.ip_signup !== undefined && { ip_signup: member.ip_signup })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
