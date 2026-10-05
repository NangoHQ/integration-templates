import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        list_address: z.string().describe('Email-style address of the mailing list to retrieve. Example: "qa_list@sandbox123.mailgun.org"'),
        page_limit: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Maximum number of member pages to fetch (each page holds up to 100 members). Omit to walk every page until the roster is exhausted.')
    })
    .describe('Input for retrieving a mailing list together with its members.');

const ListSchema = z
    .object({
        address: z.string().describe('Email-style address identifying the mailing list.'),
        name: z.string().optional().describe('Human-readable name of the mailing list. Omitted when Mailgun returns none.'),
        access_level: z.string().describe('Who can read and post to the list (e.g. "readonly", "members", "everyone").'),
        created_at: z.string().describe('Creation timestamp of the list in RFC 2822 format.'),
        description: z.string().nullable().optional().describe('Description of the mailing list, or null when unset.'),
        members_count: z.number().describe('Total number of members on the list.'),
        reply_preference: z
            .string()
            .nullable()
            .optional()
            .describe('Where replies to list messages should be directed (e.g. "list", "sender"), or null when unset.')
    })
    .describe('Details of the mailing list.');

const MemberSchema = z
    .object({
        address: z.string().describe('Email address of the list member.'),
        name: z.string().optional().describe('Full name of the member, when set.'),
        subscribed: z.boolean().describe('Whether the member is subscribed to the list.'),
        vars: z.record(z.string(), z.unknown()).optional().describe('Custom JSON variables attached to the member.')
    })
    .describe('A single member of the mailing list.');

const OutputSchema = z
    .object({
        list: ListSchema,
        members: z.array(MemberSchema).describe('Roster of the mailing list, assembled across all fetched member pages.'),
        truncated: z
            .boolean()
            .optional()
            .describe(
                'True when more members exist beyond the returned roster because the default page cap was reached without an explicit page_limit. Present only when truncated.'
            )
    })
    .describe('A mailing list combined with its member roster.');

// Provider payload schemas accept the nullable shapes Mailgun actually returns; the public
// ListSchema/MemberSchema above keep `name` as optional-only, so null is normalized away below.
const ProviderListSchema = z.object({
    address: z.string(),
    name: z.string().nullish(),
    access_level: z.string(),
    created_at: z.string(),
    description: z.string().nullish(),
    members_count: z.number(),
    reply_preference: z.string().nullish()
});

const ProviderMemberSchema = z.object({
    address: z.string(),
    name: z.string().nullish(),
    subscribed: z.boolean(),
    vars: z.record(z.string(), z.unknown()).optional()
});

const ListResponseSchema = z.object({
    list: ProviderListSchema
});

const MembersPageSchema = z.object({
    items: z.array(ProviderMemberSchema),
    paging: z.object({
        first: z.url().optional(),
        last: z.url().optional(),
        next: z.url().optional(),
        previous: z.url().optional()
    })
});

// Bound on pages fetched when the caller omits page_limit, so a very large mailing list cannot
// grow the action output past Nango's 2 MB limit. At 100 members/page this caps the default
// roster at 5000 members; callers needing more should pass an explicit page_limit and follow up
// with list-list-members for the remainder.
const DEFAULT_MAX_PAGES = 50;

/**
 * @tags: [read]
 * @tagReason: Both internal calls are read-only GET requests (list metadata and member pages); nothing on the provider is created, modified, or deleted.
 * @pitfalls: Fetching the full roster costs one API call per 100 members, which can be slow on large lists; setting page_limit returns only the members from the first pages with no indication in the output that more exist. A missing list address surfaces as a Mailgun 404 error.
 */
const action = createAction({
    description: "Retrieves a mailing list's details together with its full member roster in one call.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedListAddress = encodeURIComponent(input.list_address);

        const listConfig: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Mailing-Lists/#tag/Mailing-Lists/operation/GET-v3-lists--list_address-
            endpoint: `/v3/lists/${encodedListAddress}`,
            retries: 3
        };
        const listResponse = await nango.get(listConfig);
        const { list: providerList } = ListResponseSchema.parse(listResponse.data);
        const list: z.infer<typeof ListSchema> = {
            address: providerList.address,
            ...(providerList.name != null && { name: providerList.name }),
            access_level: providerList.access_level,
            created_at: providerList.created_at,
            ...(providerList.description != null && { description: providerList.description }),
            members_count: providerList.members_count,
            ...(providerList.reply_preference != null && { reply_preference: providerList.reply_preference })
        };

        // An explicit page_limit is honored exactly (even past the default cap); omitting it
        // bounds the walk to DEFAULT_MAX_PAGES so the roster cannot grow past the action output
        // size limit, surfacing `truncated: true` instead.
        const effectivePageLimit = input.page_limit ?? DEFAULT_MAX_PAGES;

        const members: z.infer<typeof MemberSchema>[] = [];
        let nextEndpoint: string | undefined = `/v3/lists/${encodedListAddress}/members/pages`;
        let nextParams: Record<string, string | number> = { limit: 100 };
        let pagesFetched = 0;

        while (nextEndpoint !== undefined && pagesFetched < effectivePageLimit) {
            const membersConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Mailing-Lists/#tag/Mailing-Lists/operation/GET-v3-lists--list_address--members-pages
                endpoint: nextEndpoint,
                params: nextParams,
                retries: 3
            };
            const membersResponse = await nango.get(membersConfig);
            const page = MembersPageSchema.parse(membersResponse.data);

            for (const member of page.items) {
                members.push({
                    address: member.address,
                    ...(member.name != null && { name: member.name }),
                    subscribed: member.subscribed,
                    ...(member.vars !== undefined && { vars: member.vars })
                });
            }
            pagesFetched += 1;

            if (page.items.length === 0 || page.paging.next === undefined) {
                nextEndpoint = undefined;
            } else {
                const nextUrl = new URL(page.paging.next);
                nextEndpoint = nextUrl.pathname;
                nextParams = Object.fromEntries(nextUrl.searchParams);
            }
        }

        const truncated = input.page_limit === undefined && nextEndpoint !== undefined;

        return { list, members, ...(truncated && { truncated }) };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
