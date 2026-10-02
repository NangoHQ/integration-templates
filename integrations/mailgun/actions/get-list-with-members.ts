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
        name: z.string().describe('Human-readable name of the mailing list.'),
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
        name: z.string().describe('Full name of the member, or an empty string when unset.'),
        subscribed: z.boolean().describe('Whether the member is subscribed to the list.'),
        vars: z.record(z.string(), z.unknown()).optional().describe('Custom JSON variables attached to the member.')
    })
    .describe('A single member of the mailing list.');

const OutputSchema = z
    .object({
        list: ListSchema,
        members: z.array(MemberSchema).describe('Full roster of the mailing list, assembled across all fetched member pages.')
    })
    .describe('A mailing list combined with its member roster.');

const ListResponseSchema = z.object({
    list: ListSchema
});

const MembersPageSchema = z.object({
    items: z.array(MemberSchema),
    paging: z.object({
        first: z.url().optional(),
        last: z.url().optional(),
        next: z.url().optional(),
        previous: z.url().optional()
    })
});

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
        const { list } = ListResponseSchema.parse(listResponse.data);

        const members: z.infer<typeof MemberSchema>[] = [];
        let nextEndpoint: string | undefined = `/v3/lists/${encodedListAddress}/members/pages`;
        let nextParams: Record<string, string | number> = { limit: 100 };
        let pagesFetched = 0;

        while (nextEndpoint !== undefined && (input.page_limit === undefined || pagesFetched < input.page_limit)) {
            const membersConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Mailing-Lists/#tag/Mailing-Lists/operation/GET-v3-lists--list_address--members-pages
                endpoint: nextEndpoint,
                params: nextParams,
                retries: 3
            };
            const membersResponse = await nango.get(membersConfig);
            const page = MembersPageSchema.parse(membersResponse.data);

            members.push(...page.items);
            pagesFetched += 1;

            if (page.items.length === 0 || page.paging.next === undefined) {
                nextEndpoint = undefined;
            } else {
                const nextUrl = new URL(page.paging.next);
                nextEndpoint = nextUrl.pathname;
                nextParams = Object.fromEntries(nextUrl.searchParams);
            }
        }

        return { list, members };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
