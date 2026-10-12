import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        timelogId: z.string().describe('ID of the timelog (time entry) to permanently delete. Example: "IEAG5DAKJQAC56AI"')
    })
    .describe('Identifies the Wrike timelog (time entry) to permanently delete.');

const ProviderDeleteTimelogResponseSchema = z.object({
    kind: z.string().optional(),
    data: z.array(z.string()).optional()
});

const OutputSchema = z
    .object({
        timelogId: z.string().describe('ID of the timelog that was permanently deleted.'),
        deleted: z.boolean().describe('True once the provider confirms the timelog is gone; failures throw instead of returning false.')
    })
    .describe('Confirmation that the requested timelog was permanently deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a timelog record on the provider, an irreversible mutation that permanently removes the time entry.
 * @pitfalls: Deletion is immediate and irreversible with no Recycle Bin or restore path; re-deleting an already-deleted timelog fails with 404 instead of succeeding idempotently.
 */
const action = createAction({
    description: 'Permanently delete a timelog (time entry).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.wrike.com/reference/deletetimelogssingle
            endpoint: `/timelogs/${encodeURIComponent(input.timelogId)}`,
            // Retrying is unsafe: a retry after a lost response hits a now-missing timelog and fails
            // with 404 even though the first delete succeeded, so surface the first result as-is.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        ProviderDeleteTimelogResponseSchema.parse(response.data);

        return {
            timelogId: input.timelogId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
