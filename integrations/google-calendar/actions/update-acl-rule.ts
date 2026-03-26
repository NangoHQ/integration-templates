import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar.'),
    ruleId: z.string().describe('ACL rule identifier.'),
    role: z.enum(['none', 'freeBusyReader', 'reader', 'writer', 'owner']).optional().describe('The role assigned to the scope.'),
    scope: z
        .object({
            type: z.enum(['default', 'user', 'group', 'domain']).describe('The type of the scope.'),
            value: z.string().optional().describe('The email address of a user or group, or the name of a domain.')
        })
        .optional()
        .describe('The extent to which calendar access is granted.'),
    sendNotifications: z.boolean().optional().describe('Whether to send notifications about the calendar sharing change.')
});

const OutputSchema = z.object({
    id: z.string(),
    scope: z.object({
        type: z.string(),
        value: z.string().optional()
    }),
    role: z.string(),
    etag: z.string().optional(),
    kind: z.string().optional()
});

const action = createAction({
    description: 'Update an access control rule',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-acl-rule',
        group: 'ACL'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.acls'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build request body for ACL resource
        const requestBody: {
            role?: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner';
            scope?: {
                type: 'default' | 'user' | 'group' | 'domain';
                value?: string;
            };
        } = {};

        if (input.role !== undefined) {
            requestBody['role'] = input.role;
        }

        if (input.scope !== undefined) {
            requestBody['scope'] = {
                type: input.scope.type,
                ...(input.scope.value !== undefined && { value: input.scope.value })
            };
        }

        // Build query params
        const params: { sendNotifications?: string } = {};
        if (input.sendNotifications !== undefined) {
            params['sendNotifications'] = String(input.sendNotifications);
        }

        // https://developers.google.com/calendar/api/v3/reference/acl/update
        const response = await nango.put({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/acl/${encodeURIComponent(input.ruleId)}`,
            data: requestBody,
            ...(Object.keys(params).length > 0 && { params }),
            retries: 3
        });

        return {
            id: response.data['id'],
            scope: response.data['scope'],
            role: response.data['role'],
            etag: response.data['etag'],
            kind: response.data['kind']
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
