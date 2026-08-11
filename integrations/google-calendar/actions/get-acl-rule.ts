import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the authenticated user.'),
        rule_id: z.string().describe('ACL rule identifier.')
    })
    .describe('Input to retrieve a single access control rule from a calendar.');

const ProviderAclRuleSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    scope: z
        .object({
            type: z.string(),
            value: z.string().optional()
        })
        .optional(),
    role: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the ACL rule.'),
        role: z.string().describe('The role assigned to the scope. Possible values: none, freeBusyReader, reader, writerWithoutPrivateAccess, writer, owner.'),
        scope: z
            .object({
                type: z.string().describe('The type of the scope. Possible values: default, user, group, domain.'),
                value: z.string().optional().describe('The email address of a user or group, or the name of a domain. Omitted for type default.')
            })
            .optional()
            .describe('The extent to which calendar access is granted by this ACL rule.'),
        kind: z.string().optional().describe('Type of the resource ("calendar#aclRule").'),
        etag: z.string().optional().describe('ETag of the resource.')
    })
    .describe('A single access control rule for a calendar.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single access control rule from the provider without modifying it.
 * @pitfalls: A rule with scope.type "default" grants access to any user, authenticated or not. The owner role does not indicate the calendar's single data owner; multiple users may hold it.
 */
const action = createAction({
    description: 'Get an access control rule by ID',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/workspace/calendar/api/v3/reference/acl/get
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/acl/${encodeURIComponent(input.rule_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `ACL rule ${input.rule_id} not found on calendar ${input.calendar_id}`
            });
        }

        const providerAclRule = ProviderAclRuleSchema.parse(response.data);

        return {
            id: providerAclRule.id,
            role: providerAclRule.role,
            ...(providerAclRule.scope !== undefined && {
                scope: {
                    type: providerAclRule.scope.type,
                    ...(providerAclRule.scope.value !== undefined && { value: providerAclRule.scope.value })
                }
            }),
            ...(providerAclRule.kind !== undefined && { kind: providerAclRule.kind }),
            ...(providerAclRule.etag !== undefined && { etag: providerAclRule.etag })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
