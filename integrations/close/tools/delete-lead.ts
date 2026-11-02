import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        leadId: z.string().min(1).describe('Opaque ID of the lead to delete.')
    })
    .describe('Identifies the single lead to delete.');

const OutputSchema = z
    .object({
        id: z.string().describe('Lead ID submitted for deletion.'),
        deleted: z.literal(true).describe('Close acknowledged lead deletion; does not assert recovery or cascade semantics.')
    })
    .describe("Close's acknowledgment of the lead deletion.");

const HttpErrorSchema = z.looseObject({
    response: z.looseObject({
        status: z.number().int()
    })
});

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes the target lead record in Close, a difficult-to-reverse mutation.
 * @pitfalls: Deletion is difficult to reverse: Close's documentation does not state whether a deleted lead can be recovered or what happens to its contacts, tasks, opportunities and activities. Deleting the same ID again fails with not_found rather than succeeding.
 */
const tool = createTool({
    name: 'delete-lead',
    description: 'Delete a lead record. Related-record cascade and recovery behavior are not specified in the available documentation.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Obtain leadId with `list-leads` and verify with `get-lead`. This deletes the lead itself, not just its status or an association. Treat recovery and effects on related contacts, activities, tasks and opportunities as unknown; do not assume undo.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        // @allowTryCatch: map Close's documented 400/401/403/404 delete failures to the tool's public error codes.
        try {
            // https://developer.close.com/resources/leads/ — DELETE /lead/{id}/
            await nango.delete({
                endpoint: `/v1/lead/${encodeURIComponent(input.leadId)}/`,
                // Close documents no idempotency or replay guarantee for lead deletion, so a lost response must not be retried automatically.
                retries: 0
            });
        } catch (error) {
            const parsed = HttpErrorSchema.safeParse(error);
            const status = parsed.success ? parsed.data.response.status : undefined;

            if (status === 400) {
                throw new Error(
                    'bad_request: Close rejected the lead deletion in its current state. Inspect the lead in Close and resolve its reported restriction.'
                );
            }
            if (status === 401 || status === 403) {
                throw new Error('access_denied: Close refused to delete this lead. Ask for permission to delete this lead.');
            }
            if (status === 404) {
                throw new Error('not_found: The lead is absent or inaccessible. Verify with `get-lead`; do not substitute another lead.');
            }
            if (status !== undefined) {
                throw new Error(
                    'write_result_unknown: Close returned an unexpected response to the lead deletion. Check `get-lead` and the Close UI before retrying.'
                );
            }
            throw error;
        }

        return {
            id: input.leadId,
            deleted: true
        };
    }
});

export default tool;
