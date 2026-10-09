import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z
            .number()
            .int()
            .positive()
            .describe('Timely account ID that owns the project. Discover it with the list-accounts action. Example: 1145787'),
        project_id: z.number().int().positive().describe('ID of the project to permanently delete. Example: 5698287')
    })
    .describe('Identifies the Timely account and the project to permanently delete.');

const OutputSchema = z
    .object({
        deleted: z.boolean().describe('True when the provider confirmed the deletion with a successful (HTTP 200) response.'),
        account_id: z.number().int().describe('Account ID the deleted project belonged to.'),
        project_id: z.number().int().describe('ID of the project that was deleted.')
    })
    .describe('Confirmation of the permanently deleted project.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes the provider project (a provider mutation) and the deletion is a confirmed irreversible cascade that also destroys every time entry logged against it.
 * @pitfalls: Deleting a project is permanent and also deletes every time entry (event) logged against it, with no undo and no report of how many were removed; deleting an already-missing project fails with a 404.
 */
const action = createAction({
    description: 'Permanently delete a project. WARNING: confirmed live to cascade-delete every event (time entry) logged against it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const accountId = encodeURIComponent(String(input.account_id));
        const projectId = encodeURIComponent(String(input.project_id));

        // Docs: https://docs.nango.dev/integrations/all/timely (Timely API: DELETE /1.1/{account_id}/projects/{project_id})
        // HTTP DELETE is idempotent, so a retry can only re-confirm the same deleted state.
        await nango.delete({
            endpoint: `/1.1/${accountId}/projects/${projectId}`,
            retries: 3
        });

        return {
            deleted: true,
            account_id: input.account_id,
            project_id: input.project_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
