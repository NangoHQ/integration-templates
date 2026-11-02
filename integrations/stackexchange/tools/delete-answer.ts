import { z } from 'zod';
import { createTool } from 'nango';
import { randomUUID } from 'node:crypto';

const InputSchema = z
    .object({
        site: z.string().min(1).describe('Site API identifier containing the answer.'),
        answerId: z
            .string()
            .regex(/^[1-9][0-9]*$/)
            .describe('Site-local answer ID to delete.')
    })
    .describe('Identifies the answer to delete: the site API identifier and the site-local answer ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('Requested answer ID acknowledged by the delete call.'),
        site: z.string().describe('Site API identifier containing the deleted answer.'),
        deleted: z.literal(true).describe('True after provider acknowledgement of deletion; does not claim permanent erasure.')
    })
    .describe('Acknowledgement that the provider accepted the answer deletion.');

// Stack Exchange wraps every method response in a common wrapper. Write methods return no object, and errors are
// reported in the error_id, error_name and error_message fields with HTTP 400 for all method errors.
const ResponseWrapperSchema = z.looseObject({
    items: z.array(z.unknown()).optional(),
    has_more: z.boolean().optional(),
    quota_max: z.number().optional(),
    quota_remaining: z.number().optional(),
    backoff: z.number().optional(),
    error_id: z.number().optional(),
    error_name: z.string().optional(),
    error_message: z.string().optional()
});

// Errors thrown by the Nango proxy carry the provider response on `response`.
const ProxyErrorSchema = z.looseObject({
    message: z.string().optional(),
    response: z
        .looseObject({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const NOT_FOUND_MESSAGE = /not found|no answer|does not exist|already deleted/i;

function providerError(errorName: string, errorMessage: string | undefined): Error {
    const reason = errorMessage !== undefined && errorMessage.length > 0 ? ` Provider reason: ${errorMessage}` : '';
    const looksMissing = errorMessage !== undefined && NOT_FOUND_MESSAGE.test(errorMessage);
    switch (errorName) {
        case 'bad_parameter':
            if (looksMissing) {
                return new Error(`answer_not_found: The answer is unavailable or already deleted and the provider refused deletion.${reason}`);
            }
            return new Error(`bad_parameter: The provider rejected the site or target value. Correct the site or answer ID.${reason}`);
        case 'access_denied':
            if (errorMessage !== undefined && /stack apps/i.test(errorMessage)) {
                return new Error(
                    `app_write_disabled: Application writing is disabled; the app needs a registered Stack Apps post restored by its administrator.${reason}`
                );
            }
            return new Error(`access_denied: The connected user is not the answer owner or the token lacks write_access.${reason}`);
        case 'access_token_required':
        case 'invalid_access_token':
        case 'access_token_compromised':
        case 'key_required':
            return new Error(`access_denied: The connection credentials were rejected; reconnect with write_access permission.${reason}`);
        case 'write_failed':
            if (looksMissing) {
                return new Error(`answer_not_found: The answer is unavailable or already deleted and the provider refused deletion.${reason}`);
            }
            return new Error(
                `write_failed: Even the owner cannot delete this answer under current site restrictions; this API does not cast delete votes.${reason}`
            );
        case 'duplicate_request':
            return new Error(
                `duplicate_request: The provider already ran this request ID. Check whether the deletion happened before invoking again.${reason}`
            );
        case 'internal_error':
            return new Error(`internal_error: The provider reported an unexpected API error. Check the deletion state before retrying later.${reason}`);
        case 'throttle_violation':
            return new Error(
                `throttle_violation: Provider rate, quota or backoff restrictions apply. Wait for recovery and check the deletion state before retrying.${reason}`
            );
        case 'temporarily_unavailable':
            return new Error(
                `temporarily_unavailable: The provider reported temporary unavailability. Back off and inspect the deletion state before another write.${reason}`
            );
        default:
            return new Error(
                `internal_error: The provider reported an unexpected error named '${errorName}'. Check the deletion state before retrying later.${reason}`
            );
    }
}

function mapProxyError(error: unknown): Error {
    const parsed = ProxyErrorSchema.safeParse(error);
    if (parsed.success) {
        const envelope = ResponseWrapperSchema.safeParse(parsed.data.response?.data);
        if (envelope.success && envelope.data.error_name !== undefined) {
            return providerError(envelope.data.error_name, envelope.data.error_message);
        }
        const status = parsed.data.response?.status;
        if (status === 502) {
            return new Error(
                'throttle_violation: Provider rate, quota or backoff restrictions apply. Wait for recovery and check the deletion state before retrying.'
            );
        }
        if (status === 503) {
            return new Error(
                'temporarily_unavailable: The provider reported temporary unavailability. Back off and inspect the deletion state before another write.'
            );
        }
    }
    return new Error(
        'write_result_unavailable: The deletion may have succeeded but the acknowledgement could not be established. Check the answer on the website before retrying.'
    );
}

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing answer through the provider's write API, a provider-side mutation that the API cannot reverse.
 * @pitfalls: Only the answer's owner can delete it, and even the owner is refused under some site rules (for example an accepted answer). The API cannot undelete an answer. A repeat call for an already-deleted answer is refused as answer_not_found, and a write_result_unavailable failure may still have deleted the answer, so check the answer on the site before retrying.
 */
const tool = createTool({
    name: 'delete-answer',
    description: 'Delete an answer owned by the connected user, subject to site deletion restrictions. The API cannot undelete it.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Get the answer ID from `get-answer` or `list-answers`. Only the answer owner can use this operation, and some answers cannot be owner-deleted. This deletes the answer rather than casting a delete vote. There is no API undo; do not treat this as permanent erasure of provider data.',
        requiredScopes: ['write_access'],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const token = z.string().safeParse(await nango.getToken());
        if (!token.success) {
            throw new Error('access_denied: The connection does not hold an OAuth2 access token; reconnect with write_access permission.');
        }

        // Stack Exchange write methods expect all parameters submitted as form data, not on the query string.
        // `preview` is omitted so the deletion is executed for real, and the generated request_id lets the provider
        // detect internal retries as duplicates instead of deleting twice.
        const form = new URLSearchParams();
        form.set('site', input.site);
        form.set('access_token', token.data);
        form.set('request_id', randomUUID());

        // https://api.stackexchange.com/docs/delete-answer
        const response = await nango
            .post({
                endpoint: `/2.3/answers/${encodeURIComponent(input.answerId)}/delete`,
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                data: form.toString(),
                // Retries resend the same request_id, so a duplicated delivery is rejected with duplicate_request instead of repeating the deletion.
                retries: 2
            })
            .catch((error: unknown) => {
                throw mapProxyError(error);
            });

        const wrapper = ResponseWrapperSchema.safeParse(response.data);
        if (!wrapper.success) {
            throw new Error(
                'write_result_unavailable: The deletion may have succeeded but the acknowledgement could not be established. Check the answer on the website before retrying.'
            );
        }

        return {
            id: input.answerId,
            site: input.site,
            deleted: true
        };
    }
});

export default tool;
