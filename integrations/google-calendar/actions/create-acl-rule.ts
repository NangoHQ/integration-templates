import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.'),
    role: z
        .enum(['none', 'freeBusyReader', 'reader', 'writer', 'owner'])
        .describe(
            'The role assigned to the scope. Possible values: "none" - Provides no access, "freeBusyReader" - Provides read access to free/busy information, "reader" - Provides read access to the calendar, "writer" - Provides read and write access to the calendar, "owner" - Provides manager access to the calendar.'
        ),
    scopeType: z
        .enum(['default', 'user', 'group', 'domain'])
        .describe(
            'The type of the scope. Possible values: "default" - The public scope, "user" - Limits the scope to a single user, "group" - Limits the scope to a group, "domain" - Limits the scope to a domain.'
        ),
    scopeValue: z
        .string()
        .optional()
        .describe('The email address of a user or group, or the name of a domain, depending on the scope type. Omitted for type "default".'),
    sendNotifications: z.boolean().optional().describe('Whether to send notifications about the calendar sharing change. Optional. The default is True.')
});

const OutputSchema = z.object({
    id: z.string().describe('The identifier of the ACL rule.'),
    etag: z.string().describe('ETag of the resource.'),
    kind: z.string().describe('Type of the resource ("calendar#aclRule").'),
    role: z.enum(['none', 'freeBusyReader', 'reader', 'writer', 'owner']).describe('The role assigned to the scope.'),
    scope: z
        .object({
            type: z.enum(['default', 'user', 'group', 'domain']).describe('The type of the scope.'),
            value: z.string().optional().describe('The email address of a user or group, or the name of a domain.')
        })
        .describe('The extent to which calendar access is granted by this ACL rule.')
});

const action = createAction({
    description: 'Create an access control rule',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-acl-rule',
        group: 'Calendar'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.acls'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/acl/insert
        const params: Record<string, string> = {};
        if (input.sendNotifications !== undefined) {
            params['sendNotifications'] = String(input.sendNotifications);
        }

        const config = {
            endpoint: `/calendar/v3/calendars/${input.calendarId}/acl`,
            data: {
                role: input.role,
                scope: {
                    type: input.scopeType,
                    ...(input.scopeValue && { value: input.scopeValue })
                }
            },
            ...(Object.keys(params).length > 0 && { params }),
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create ACL rule - no data returned'
            });
        }

        return {
            id: response.data.id,
            etag: response.data.etag,
            kind: response.data.kind,
            role: response.data.role,
            scope: {
                type: response.data.scope.type,
                value: response.data.scope.value
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
