import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar.'),
    max_results: z.number().int().min(1).max(250).optional().describe('Maximum number of entries returned on one result page. Default is 100, max is 250.'),
    cursor: z.string().optional().describe('Pagination token from previous response to get the next page.'),
    show_deleted: z.boolean().optional().describe('Whether to include deleted ACLs (role="none") in the result. Default is false.')
});

const AclRuleSchema = z
    .object({
        id: z.string().describe('Identifier of the ACL rule'),
        etag: z.string().describe('ETag of the resource'),
        kind: z.string().describe('Type of the resource ("calendar#aclRule")'),
        scope: z
            .object({
                type: z.string().describe('The type of the scope ("default", "user", "group", "domain")'),
                value: z.string().optional().describe('The specific email address, group email address, or domain name')
            })
            .passthrough(),
        role: z.string().describe('The role of the ACL rule ("none", "freeBusyReader", "reader", "writer", "owner")')
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AclRuleSchema).describe('List of rules on the access control list'),
    next_cursor: z.union([z.string(), z.null()]).describe('Token to retrieve the next page of results. Null if no more pages.'),
    next_sync_token: z.union([z.string(), z.null()]).optional().describe('Token to retrieve only entries changed since this result was returned.')
});

const action = createAction({
    description: 'List ACL rules for a calendar with pagination support',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/list-acl-rules',
        group: 'ACL'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.acls',
        'https://www.googleapis.com/auth/calendar.acls.readonly'
    ],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/workspace/calendar/api/v3/reference/acl/list
            endpoint: `/calendar/v3/calendars/${input.calendar_id}/acl`,
            params: {
                ...(input.max_results && { maxResults: input.max_results }),
                ...(input.cursor && { pageToken: input.cursor }),
                ...(input.show_deleted !== undefined && { showDeleted: String(input.show_deleted) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            items: response.data.items || [],
            next_cursor: response.data.nextPageToken || null,
            next_sync_token: response.data.nextSyncToken || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
