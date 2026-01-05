/**
 * Instructions: Returns an access control rule by rule ID
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/acl/get
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetAclRuleInput = z.object({
    calendar_id: z.string(),
    rule_id: z.string()
});

const GetAclRuleOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    scope: z.any(),
    role: z.string()
});

const action = createAction({
    description: 'Returns an access control rule by rule ID',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/acl/get
    endpoint: {
        method: 'GET',
        path: '/acl/rule',
        group: 'Access Control'
    },
    input: GetAclRuleInput,
    output: GetAclRuleOutput,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    exec: async (nango, input): Promise<z.infer<typeof GetAclRuleOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/acl/get
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/acl/${encodeURIComponent(input.rule_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

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
