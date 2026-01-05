/**
 * Instructions: Returns the rules in the access control list for a calendar
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/acl/list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ListAclRulesInput = z.object({
    calendar_id: z.string(),
    maxResults: z.number().optional(),
    pageToken: z.string().optional()
});

const ListAclRulesOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    nextPageToken: z.string().optional(),
    items: z.array(z.any())
});

const action = createAction({
    description: 'Returns the rules in the access control list for a calendar',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/acl/list
    endpoint: {
        method: 'GET',
        path: '/acl',
        group: 'Access Control'
    },
    input: ListAclRulesInput,
    output: ListAclRulesOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof ListAclRulesOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/acl/list
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/acl`,
            params: {
                ...(input.maxResults && { maxResults: input.maxResults.toString() }),
                ...(input.pageToken && { pageToken: input.pageToken })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            nextPageToken: response.data.nextPageToken,
            items: response.data.items || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
