/**
 * Instructions: Creates an access control rule granting calendar access
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/acl/insert
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const CreateAclRuleInput = z.object({
    calendar_id: z.string(),
    role: z.string(),
    scope_type: z.string(),
    scope_value: z.string().optional()
});

const CreateAclRuleOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    scope: z.any(),
    role: z.string()
});

const action = createAction({
    description: 'Creates an access control rule granting calendar access',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/acl/insert
    endpoint: {
        method: 'POST',
        path: '/acl',
        group: 'Access Control'
    },
    input: CreateAclRuleInput,
    output: CreateAclRuleOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof CreateAclRuleOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/acl/insert
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/acl`,
            data: {
                role: input.role,
                scope: {
                    type: input.scope_type,
                    ...(input.scope_value && { value: input.scope_value })
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

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
