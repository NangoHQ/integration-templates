import { z } from 'zod';
import { createAction } from 'nango';

const ScopeInputSchema = z.object({
    type: z.string().describe('The type of the scope. Possible values are: "default", "user", "group", "domain".'),
    value: z.string().optional().describe('The email address of a user or group, or the name of a domain. Omitted for type "default".')
});

const InputSchema = z
    .object({
        calendarId: z
            .string()
            .describe(
                'Calendar identifier. To retrieve calendar IDs call the calendarList.list method. Use "primary" for the primary calendar of the logged-in user.'
            ),
        ruleId: z.string().describe('ACL rule identifier.'),
        role: z
            .string()
            .optional()
            .describe(
                'The role assigned to the scope. Possible values are: "none", "freeBusyReader", "reader", "writerWithoutPrivateAccess", "writer", "owner".'
            ),
        scope: ScopeInputSchema.describe('The extent to which calendar access is granted by this ACL rule.'),
        sendNotifications: z.boolean().optional().describe('Whether to send notifications about the calendar sharing change. Defaults to true.')
    })
    .describe('Input for updating an access control rule');

const ScopeOutputSchema = z.object({
    type: z.string().describe('The type of the scope.'),
    value: z.string().optional().describe('The email address or domain name.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the ACL rule.'),
        role: z.string().describe('The role assigned to the scope.'),
        scope: ScopeOutputSchema.describe('The extent of calendar access granted by this ACL rule.'),
        etag: z.string().optional().describe('ETag of the resource.'),
        kind: z.string().optional().describe('Type of the resource. Always "calendar#aclRule".')
    })
    .describe('The updated access control rule');

/**
 * @tags: [write]
 * @tagReason: Performs a PUT to modify an existing access control rule on the provider.
 * @pitfalls: There are no notifications on access removal even when sendNotifications is true. The "owner" role does not transfer calendar data ownership; a calendar can have multiple users with owner role.
 */
const action = createAction({
    description: 'Update an access control rule',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.google.com/workspace/calendar/api/v3/reference/acl/update
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/acl/${encodeURIComponent(input.ruleId)}`,
            params: {
                ...(input.sendNotifications !== undefined && { sendNotifications: String(input.sendNotifications) })
            },
            data: {
                ...(input.role !== undefined && { role: input.role }),
                scope: {
                    type: input.scope.type,
                    ...(input.scope.value !== undefined && { value: input.scope.value })
                }
            },
            retries: 3
        });

        const providerAcl = z
            .object({
                id: z.string(),
                role: z.string(),
                scope: z.object({
                    type: z.string(),
                    value: z.string().optional()
                }),
                etag: z.string().optional(),
                kind: z.string().optional()
            })
            .parse(response.data);

        return {
            id: providerAcl.id,
            role: providerAcl.role,
            scope: {
                type: providerAcl.scope.type,
                ...(providerAcl.scope.value !== undefined && { value: providerAcl.scope.value })
            },
            ...(providerAcl.etag !== undefined && { etag: providerAcl.etag }),
            ...(providerAcl.kind !== undefined && { kind: providerAcl.kind })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
