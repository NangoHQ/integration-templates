import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the member belongs to. Example: "nangodev"'),
        member_id: z.string().describe('The ID of the organization member to remove. Example: "15174593"')
    })
    .describe('Input for removing a member from a Sentry organization.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the member was successfully removed from the organization (Sentry returns 204 No Content).')
    })
    .describe('Result of removing a member from a Sentry organization.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an organization member through the provider API, a mutation that revokes the member's access and cannot be undone.
 * @pitfalls: Removal is permanent; the member must be re-invited to rejoin. Sentry returns a 400 error when the target member has more access than the acting user, even if the token carries member:admin scope.
 */
const action = createAction({
    description: 'Remove a member from the organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['member:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/organizations/delete-an-organization-member/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/members/${encodeURIComponent(input.member_id)}/`,
            retries: 3
        };
        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
