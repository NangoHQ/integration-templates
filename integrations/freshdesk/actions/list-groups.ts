import { z } from 'zod';
import { createAction } from 'nango';

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    business_hour_id: z.number().nullable().optional(),
    escalate_to: z.number().nullable().optional(),
    unassigned_for: z.string().nullable().optional(),
    auto_ticket_assign: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const GroupSchema = z.object({
    id: z.number().describe('Unique ID of the group.'),
    name: z.string().describe('Name of the group.'),
    description: z.string().optional().describe('Description of the group.'),
    business_hour_id: z.number().optional().describe('Unique ID of the business hour associated with the group.'),
    escalate_to: z.number().optional().describe('The ID of the user to whom an escalation email is sent if a ticket is unassigned.'),
    unassigned_for: z.string().optional().describe('The time after which an escalation email is sent if a ticket remains unassigned.'),
    auto_ticket_assign: z.number().optional().describe('Describes the type of automatic ticket assignment set for the group.'),
    created_at: z.string().optional().describe('Group creation timestamp in UTC.'),
    updated_at: z.string().optional().describe('Group updated timestamp in UTC.')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().optional().describe('Number of groups to return per page. Maximum 100.')
    })
    .describe('Input for listing Freshdesk groups.');

const OutputSchema = z
    .object({
        items: z.array(GroupSchema).describe('List of groups for the current page.'),
        next_cursor: z.string().optional().describe('Cursor for the next page. Omit if there are no more pages.')
    })
    .describe('Output for listing Freshdesk groups.');

/**
 * @tags: [read]
 * @tagReason: Reads groups from Freshdesk.
 * @pitfalls: Requires admin privileges; non-admin agents will receive a 403 Access Denied error.
 */
const action = createAction({
    description: 'List groups from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        const perPage = input.per_page;

        const response = await nango.get({
            // https://developers.freshdesk.com/api/#list_all_groups
            endpoint: '/api/v2/groups',
            params: {
                page: String(page),
                ...(perPage !== undefined && { per_page: String(perPage) })
            },
            retries: 3
        });

        const providerGroups = z.array(ProviderGroupSchema).parse(response.data);

        const items = providerGroups.map((group) => ({
            id: group.id,
            name: group.name,
            ...(group.description != null && { description: group.description }),
            ...(group.business_hour_id != null && { business_hour_id: group.business_hour_id }),
            ...(group.escalate_to != null && { escalate_to: group.escalate_to }),
            ...(group.unassigned_for != null && { unassigned_for: group.unassigned_for }),
            ...(group.auto_ticket_assign != null && { auto_ticket_assign: group.auto_ticket_assign }),
            ...(group.created_at != null && { created_at: group.created_at }),
            ...(group.updated_at != null && { updated_at: group.updated_at })
        }));

        let nextCursor: string | undefined;
        const linkHeader =
            (typeof response.headers === 'object' && response.headers !== null ? response.headers['link'] || response.headers['Link'] : undefined) || undefined;

        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>\s*;\s*rel="next"/i);
            if (nextMatch) {
                nextCursor = nextMatch[1];
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
