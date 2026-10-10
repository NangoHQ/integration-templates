import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('ID of the Timely account that owns the label. Discover it with list-accounts. Example: 1145787.'),
        label_id: z.number().int().positive().describe('ID of the label to delete. Example: 4687689.')
    })
    .describe('Identifiers for the label to delete.');

const OutputSchema = z
    .object({
        deleted: z.boolean().describe('True when the label was permanently deleted.'),
        label_id: z.number().describe('ID of the label that was deleted.')
    })
    .describe('Confirmation that the label was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an existing Timely label, a hard provider mutation that cannot be undone.
 * @pitfalls: The deletion is permanent and irreversible: once it succeeds the label is gone (a follow-up fetch returns 404) and it cannot be restored.
 */
const action = createAction({
    description: 'Permanently delete a label.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.timely.com/
        await nango.delete({
            endpoint: `/1.1/${input.account_id}/labels/${input.label_id}`,
            retries: 1 // destructive hard delete: one retry only, to limit repeating the call after a lost response
        });

        return {
            deleted: true,
            label_id: input.label_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
