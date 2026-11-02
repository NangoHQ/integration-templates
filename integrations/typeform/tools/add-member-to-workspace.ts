import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        workspaceId: z.string().min(1).describe('Opaque identifier of the workspace receiving the member.'),
        email: z.email().describe('Email address identifying the person to add; no case rewriting is performed.'),
        role: z.enum(['owner', 'member']).describe('Workspace role to grant; owner conveys elevated workspace authority.')
    })
    .describe("Target workspace, the person's email, and the workspace role to grant.");

const OutputSchema = z
    .object({
        workspaceId: z.string().describe('Workspace to which the membership change was submitted.'),
        email: z.string().describe("Person's submitted email address."),
        role: z.enum(['owner', 'member']).describe('Requested role acknowledged by Typeform.'),
        accepted: z.literal(true).describe('Typeform accepted the operation; this does not establish invitation delivery or a new user account.')
    })
    .describe('Acknowledgment that Typeform accepted the workspace membership addition.');

interface ProviderErrorInfo {
    status: number | undefined;
    detail: string | undefined;
}

function getProviderErrorInfo(error: unknown): ProviderErrorInfo {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return { status: undefined, detail: undefined };
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null) {
        return { status: undefined, detail: undefined };
    }
    let status: number | undefined;
    if ('status' in response && typeof response.status === 'number') {
        status = response.status;
    }
    let detail: string | undefined;
    if ('data' in response && typeof response.data === 'object' && response.data !== null) {
        const data = response.data;
        if ('description' in data && typeof data.description === 'string') {
            detail = data.description;
        } else if ('message' in data && typeof data.message === 'string') {
            detail = data.message;
        }
    }
    return { status, detail };
}

function toPublicError(error: unknown): Error {
    const { status, detail } = getProviderErrorInfo(error);
    const suffix = detail !== undefined ? ` Typeform: ${detail}` : '';
    switch (status) {
        case 400:
            return new Error(`validation_error: Typeform rejects the person or role under additional business rules.${suffix}`);
        case 401:
        case 403:
            return new Error(`permission_denied: The caller cannot administer this workspace or grant the requested role.${suffix}`);
        case 402:
            return new Error(`payment_required: The requested membership requires plan capacity or a paid feature.${suffix}`);
        case 404:
            return new Error(`not_found: The workspace or referenced person cannot be resolved.${suffix}`);
        case 409:
            return new Error(`conflict: Existing membership or workspace state prevents the addition.${suffix}`);
        case 429:
            return new Error(`rate_limited: Typeform explicitly rejects the request rate. Wait before retrying the addition.${suffix}`);
        default:
            break;
    }
    if (status !== undefined && status >= 500) {
        return new Error(`provider_unavailable: Typeform reports server or service unavailability.${suffix}`);
    }
    return new Error(`write_result_unknown: The write result cannot be interpreted after possible acceptance.${suffix}`);
}

/**
 * @tags: [write, destructive]
 * @tagReason: Sends a JSON Patch that grants a person membership in a Typeform workspace; granting workspace access, especially the owner role, is a hard-to-reverse authorization change.
 * @pitfalls: Success means only that Typeform accepted the membership change; it does not confirm that an invitation email was delivered, and the empty response does not reflect the resulting roster, so use `get-workspace` to verify the outcome.
 */
const tool = createTool({
    name: 'add-member-to-workspace',
    description: 'Add a person identified by email to a workspace with an owner or member role.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use workspaceId from `list-workspaces` and inspect the roster with `get-workspace` first. This grants workspace access; owner is elevated authority. Existing-member behavior and invitation delivery are not guaranteed. Use `batch-update-workspace-members` for multiple changes, or `remove-member-from-workspace` to revoke membership.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        // @allowTryCatch: translate Typeform HTTP failure statuses into the tool's public error codes; a missing status means the write result is unknown.
        try {
            // https://www.typeform.com/developers/create/reference/update-workspace/
            await nango.patch({
                endpoint: `/workspaces/${encodeURIComponent(input.workspaceId)}`,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                params: {
                    op: 'add',
                    path: '/members',
                    email: input.email,
                    role: input.role
                },
                // Non-idempotent write: Typeform documents no idempotency key, and retrying after a lost 204 response would repeat the membership change.
                retries: 0
            });
        } catch (error: unknown) {
            throw toPublicError(error);
        }

        return {
            workspaceId: input.workspaceId,
            email: input.email,
            role: input.role,
            accepted: true
        };
    }
});

export default tool;
