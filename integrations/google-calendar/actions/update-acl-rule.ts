/**
 * Instructions: Updates an access control rule
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/acl/update
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const UpdateAclRuleInput = z.object({
    calendar_id: z.string(),
    rule_id: z.string(),
    role: z.string(),
    scope_type: z.string(),
    scope_value: z.string().optional()
});

const UpdateAclRuleOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    scope: z.any(),
    role: z.string()
});

const action = createAction({
    description: 'Updates an access control rule',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/acl/update
    endpoint: {
        method: 'PUT',
        path: '/acl/rule',
        group: 'Access Control'
    },
    input: UpdateAclRuleInput,
    output: UpdateAclRuleOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof UpdateAclRuleOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/acl/update
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/acl/${encodeURIComponent(input.rule_id)}`,
            data: {
                role: input.role,
                scope: {
                    type: input.scope_type,
                    ...(input.scope_value && { value: input.scope_value })
                }
            },
            retries: 3
        };

        const response = await nango.put(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            scope: response.data.scope,
            role: response.data.role
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
