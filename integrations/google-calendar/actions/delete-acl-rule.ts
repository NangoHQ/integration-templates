/**
 * Instructions: Deletes an access control rule
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/acl/delete
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DeleteAclRuleInput = z.object({
    calendar_id: z.string(),
    rule_id: z.string()
});

const DeleteAclRuleOutput = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Deletes an access control rule',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/acl/delete
    endpoint: {
        method: 'DELETE',
        path: '/acl/rule',
        group: 'Access Control'
    },
    input: DeleteAclRuleInput,
    output: DeleteAclRuleOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof DeleteAclRuleOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/acl/delete
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/acl/${encodeURIComponent(input.rule_id)}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
