import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        sourceUserId: z
            .string()
            .regex(/^[0-9]+$/)
            .describe('End user to merge away; must differ from target and request at most 10,000 tickets.'),
        targetUserId: z
            .string()
            .regex(/^[0-9]+$/)
            .describe('Existing end user receiving the merge and retaining identity.')
    })
    .describe('Merge request identifying the end user to merge away (sourceUserId) and the end user that survives (targetUserId).');

const OutputSchema = z
    .object({
        id: z.string().describe('Surviving target user ID.'),
        name: z.string().describe('Resolved target display name.'),
        email: z.string().nullable().optional().describe('Resolved primary email when returned.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Target update instant in UTC retaining precision.')
    })
    .describe('The surviving target end user after the merge.');

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

const MergeResponseSchema = z.object({
    user: z
        .object({
            id: z.number().optional(),
            name: z.string().optional(),
            email: z.string().nullable().optional(),
            updated_at: z.string().optional()
        })
        .optional()
});

function httpStatusOf(err: unknown): number | undefined {
    const parsed = HttpErrorSchema.safeParse(err);
    return parsed.success ? parsed.data.response.status : undefined;
}

const WRITE_RESULT_UNKNOWN =
    'write_result_unknown: The merge may have happened but the response cannot be mapped. Inspect target and source availability before repeating.';

/**
 * @tags: [write, destructive]
 * @tagReason: Merges one end user into another in Zendesk, a provider-side write that irreversibly consolidates the source user's data under the target identity.
 * @pitfalls: The merge is irreversible and sourceUserId is merged into targetUserId, not the reverse. Agents, admins, sharing-agreement users, and sources requesting over 10,000 tickets are blocked. Merged data can take a few seconds to appear on the surviving user.
 */
const tool = createTool({
    name: 'create-end-user-merge',
    description: 'Merge one eligible end user into another existing end user, retaining the target identity under Zendesk merge rules.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Get both IDs via `list-users`/`get-user`. sourceUserId is merged into targetUserId, not the reverse. Staff and sharing-agreement users are excluded; source may request at most 10,000 tickets. Inspect counts with `get-user-related-information`. This destructively consolidates data; do not expect undo.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        if (input.sourceUserId === input.targetUserId) {
            throw new Error('invalid_merge: Source and target are identical. Choose distinct end users and verify direction.');
        }

        let response;
        // @allowTryCatch: Map provider HTTP statuses to the tool's public error codes; unmapped errors are rethrown unchanged.
        try {
            // https://developer.zendesk.com/api-reference/ticketing/users/users/#merge-end-users
            response = await nango.put({
                endpoint: `/api/v2/users/${encodeURIComponent(input.sourceUserId)}/merge`,
                params: {
                    'user[id]': Number(input.targetUserId)
                },
                // A retried merge after a lost response could repeat the destructive consolidation, so no automatic retries.
                retries: 0
            });
        } catch (err: unknown) {
            const status = httpStatusOf(err);
            if (status === 404) {
                throw new Error('not_found: Either user is unavailable. Check both with `get-user`.');
            }
            if (status === 403) {
                throw new Error(
                    'permission_denied: The connection is not an admin or agent allowed to edit end users. Ask an administrator for end-user editing authority.'
                );
            }
            if (status === 400 || status === 422) {
                throw new Error(
                    'user_state_conflict: A staff, sharing-agreement, ticket-threshold or other eligibility rule blocks the merge. Inspect profiles and source counts, then choose eligible users.'
                );
            }
            if (status === 409) {
                throw new Error(
                    'user_conflict: Concurrent changes or an identity conflict block the merge. Re-read both users, resolve the conflict and reassess.'
                );
            }
            if (status === 429) {
                throw new Error(
                    'rate_limited: Zendesk reported a usage limit. Wait for the Retry-After interval and inspect both users before uncertain replay.'
                );
            }
            if (status !== undefined && status >= 500) {
                throw new Error(
                    'provider_unavailable: Zendesk reported internal issues or maintenance. Inspect source and target state before retrying later.'
                );
            }
            throw err;
        }

        const parsed = MergeResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(WRITE_RESULT_UNKNOWN);
        }

        const survivingUser = parsed.data.user;
        if (!survivingUser || survivingUser.id === undefined || survivingUser.name === undefined) {
            throw new Error(WRITE_RESULT_UNKNOWN);
        }

        if (survivingUser.id !== Number(input.targetUserId)) {
            throw new Error(WRITE_RESULT_UNKNOWN);
        }

        let updatedAt: string | undefined;
        if (survivingUser.updated_at !== undefined) {
            const ms = Date.parse(survivingUser.updated_at);
            if (Number.isNaN(ms)) {
                throw new Error(WRITE_RESULT_UNKNOWN);
            }
            updatedAt = new Date(ms).toISOString();
        }

        return {
            id: String(survivingUser.id),
            name: survivingUser.name,
            ...(survivingUser.email !== undefined && { email: survivingUser.email }),
            ...(updatedAt !== undefined && { updatedAt })
        };
    }
});

export default tool;
