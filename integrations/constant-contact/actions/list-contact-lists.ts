import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional()
            .describe('Maximum number of contact lists to return per page, from 1 to 1000. Defaults to 1000 when omitted.'),
        cursor: z.string().min(1).optional().describe('Opaque pagination cursor from a previous response next_cursor. Omit to fetch the first page.'),
        include_membership_count: z
            .enum(['all', 'active'])
            .optional()
            .describe(
                'Set to "all" to include the total number of contacts on each list, or "active" to count only active (mailable) contacts. Omit to exclude membership counts.'
            ),
        status: z
            .enum(['active', 'deleted', 'all'])
            .optional()
            .describe('Filter the returned lists by status: only "active" lists, only "deleted" lists, or "all" lists.')
    })
    .describe('Pagination and filter options for listing contact lists.');

const ContactListSchema = z.object({
    list_id: z.string().describe('Unique ID of the contact list. Example: "50429486-338f-11ed-a355-fa163ef30863".'),
    name: z.string().describe('Name of the contact list.'),
    description: z.string().optional().describe('Description of the contact list. Omitted when the list has no description.'),
    favorite: z.boolean().describe('Whether the contact list is marked as a favorite.'),
    created_at: z.string().describe('ISO-8601 timestamp of when the contact list was created. Example: "2022-09-13T18:10:13Z".'),
    updated_at: z.string().describe('ISO-8601 timestamp of when the contact list was last updated.'),
    membership_count: z
        .number()
        .int()
        .optional()
        .describe(
            'Number of contacts on the list, counted according to include_membership_count ("all" counts every member, "active" counts only mailable members). Omitted unless include_membership_count is set.'
        )
});

const OutputSchema = z
    .object({
        lists: z.array(ContactListSchema).describe('The page of contact lists.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as cursor to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('A page of contact lists plus the cursor for the next page.');

const ProviderContactListSchema = z.object({
    list_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    favorite: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    membership_count: z.number().int().optional()
});

const ProviderResponseSchema = z.object({
    lists: z.array(ProviderContactListSchema),
    _links: z
        .object({
            next: z.object({ href: z.string() }).optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs only a read-only GET request against the provider; nothing is created, modified, or deleted.
 * @pitfalls: The provider documents an updated_after filter for this endpoint but silently ignores it, so results are never filtered by update time and every call returns all lists matching the other filters.
 */
const action = createAction({
    description: 'List contact lists',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.constantcontact.com/api_guide/lists_get_all.html
            endpoint: '/v3/contact_lists',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.include_membership_count !== undefined && { include_membership_count: input.include_membership_count }),
                ...(input.status !== undefined && { status: input.status })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        const nextHref = parsed._links?.next?.href;
        if (nextHref) {
            const match = /[?&]cursor=([^&]+)/.exec(nextHref);
            if (match && match[1] !== undefined) {
                nextCursor = decodeURIComponent(match[1]);
            }
        }

        return {
            lists: parsed.lists.map((list) => ({
                list_id: list.list_id,
                name: list.name,
                ...(list.description !== undefined && { description: list.description }),
                favorite: list.favorite,
                created_at: list.created_at,
                updated_at: list.updated_at,
                ...(list.membership_count !== undefined && { membership_count: list.membership_count })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
