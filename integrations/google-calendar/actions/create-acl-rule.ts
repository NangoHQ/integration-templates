import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.'),
        role: z.enum(['none', 'freeBusyReader', 'reader', 'writerWithoutPrivateAccess', 'writer', 'owner']).describe('The role assigned to the scope.'),
        scope: z
            .object({
                type: z.enum(['default', 'user', 'group', 'domain']).describe('The type of the scope.'),
                value: z.string().optional().describe('The email address or domain name, depending on the scope type. Omit for type default.')
            })
            .describe('The extent of calendar access granted by this ACL rule.'),
        sendNotifications: z.boolean().optional().describe('Whether to send notifications about the calendar sharing change. Defaults to true.')
    })
    .describe('Input to create an access control rule for a calendar.');

const ProviderAclRuleSchema = z.object({
    id: z.string(),
    etag: z.string(),
    kind: z.string(),
    role: z.string(),
    scope: z.object({
        type: z.string(),
        value: z.string().optional()
    })
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the ACL rule.'),
        etag: z.string().describe('ETag of the resource.'),
        kind: z.string().describe('Type of the resource.'),
        role: z.string().describe('The role assigned to the scope.'),
        scope: z
            .object({
                type: z.string().describe('The type of the scope.'),
                value: z.string().optional().describe('The email address or domain name, depending on the scope type.')
            })
            .describe('The extent of calendar access granted by this ACL rule.')
    })
    .describe('An access control rule for a calendar.');

/**
 * @tags: [write]
 * @tagReason: Creates a new access control rule on the provider.
 * @pitfalls: The default scope type grants public access to any user, authenticated or not.
 */
const action = createAction({
    description: 'Create an access control rule',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.acls'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/workspace/calendar/api/v3/reference/acl/insert
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/acl`,
            data: {
                role: input.role,
                scope: {
                    type: input.scope.type,
                    ...(input.scope.value !== undefined && { value: input.scope.value })
                }
            },
            params: {
                ...(input.sendNotifications !== undefined && { sendNotifications: input.sendNotifications ? 'true' : 'false' })
            },
            retries: 1
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return an ACL rule.'
            });
        }

        const providerRule = ProviderAclRuleSchema.parse(response.data);

        return {
            id: providerRule.id,
            etag: providerRule.etag,
            kind: providerRule.kind,
            role: providerRule.role,
            scope: {
                type: providerRule.scope.type,
                ...(providerRule.scope.value !== undefined && { value: providerRule.scope.value })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
