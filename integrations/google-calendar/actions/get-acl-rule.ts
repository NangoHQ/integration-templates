import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the logged-in user.'),
    rule_id: z.string().describe('ACL rule identifier.')
});

const OutputSchema = z.object({
    id: z.string().describe('Identifier of the ACL rule.'),
    etag: z.string().describe('ETag of the resource.'),
    kind: z.string().describe('Type of the resource ("calendar#aclRule").'),
    role: z.string().describe('The role assigned to the scope. Possible values: "none", "freeBusyReader", "reader", "writer", "owner".'),
    scope: z
        .object({
            type: z.string().describe('The type of the scope. Possible values: "default", "user", "group", "domain".'),
            value: z.string().optional().describe('The email address of a user or group, or the name of a domain. Omitted for type "default".')
        })
        .describe('The extent to which calendar access is granted by this ACL rule.')
});

const action = createAction({
    description: 'Get an access control rule by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-acl-rule',
        group: 'ACL'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/acl/get
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${input.calendar_id}/acl/${input.rule_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'ACL rule not found',
                calendar_id: input.calendar_id,
                rule_id: input.rule_id
            });
        }

        return {
            id: response.data.id,
            etag: response.data.etag,
            kind: response.data.kind,
            role: response.data.role,
            scope: {
                type: response.data.scope?.type,
                value: response.data.scope?.value
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
