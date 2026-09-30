import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        list_address: z.string().describe('Email address of the mailing list whose members should be returned. Example: "dev-list@samples.mailgun.org"'),
        limit: z.number().int().positive().optional().describe('Maximum number of members to return per page. Mailgun defaults to 100 when omitted.'),
        subscribed: z
            .boolean()
            .optional()
            .describe(
                'Filter members by subscription status: true returns only subscribed members, false returns only unsubscribed members. Omit to return all members.'
            ),
        cursor: z.string().optional().describe('Pagination cursor returned as next_cursor by a previous call. Omit for the first page.')
    })
    .describe('Input for listing the members of a Mailgun mailing list.');

const MemberSchema = z.object({
    address: z.string().describe('Email address of the list member.'),
    name: z.string().describe('Display name of the member. Empty string when the member was added without a name.'),
    subscribed: z.boolean().describe('Whether the member is currently subscribed to the mailing list.'),
    vars: z.record(z.string(), z.unknown()).describe('Custom variables stored on the member. Empty object when none were set.')
});

const ProviderMembersResponseSchema = z.object({
    items: z.array(MemberSchema)
});

const OutputSchema = z
    .object({
        members: z.array(MemberSchema).describe('Members of the mailing list for the requested page, in ascending alphabetical order by address.'),
        next_cursor: z
            .string()
            .optional()
            .describe(
                'Cursor to pass as cursor to fetch the next page. Omitted when this page contains fewer than limit members, meaning the end of the list has been reached.'
            )
    })
    .describe('A page of mailing list members with an optional cursor for fetching the next page.');

const DEFAULT_LIMIT = 100;

/**
 * @tags: [read]
 * @tagReason: Only fetches mailing list members through a read-only GET request and never modifies provider state.
 * @pitfalls: A nonexistent list address fails with a 404 error, while an existing list with no members returns an empty members array. When the final page contains exactly limit members, next_cursor is still returned and the following call returns an empty members array; treat an empty page as the end of results.
 */
const action = createAction({
    description: 'List members of a mailing list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/get-lists-list_address-members-pages
            endpoint: `/v3/lists/${encodeURIComponent(input.list_address)}/members/pages`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.subscribed !== undefined && { subscribed: String(input.subscribed) }),
                ...(input.cursor !== undefined && { page: 'next', address: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderMembersResponseSchema.parse(response.data);
        const members = parsed.items;

        const effectiveLimit = input.limit ?? DEFAULT_LIMIT;
        const lastMember = members.length === effectiveLimit ? members[members.length - 1] : undefined;

        return {
            members,
            ...(lastMember !== undefined && { next_cursor: lastMember.address })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
