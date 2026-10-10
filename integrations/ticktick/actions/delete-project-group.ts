import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectGroupId: z.string().describe('The ID of the project group (folder) to delete. Example: "6436176a47fd2e05f26ef56e"')
    })
    .describe('Identifies the project group to delete.');

const OutputSchema = z
    .object({
        success: z
            .boolean()
            .describe(
                'True when TickTick accepted the deletion request; TickTick also returns success for unknown or already-deleted groups, so this does not prove the group existed.'
            )
    })
    .describe('Result of deleting a project group.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing project group (folder) from the account, a difficult-to-reverse provider mutation.
 * @pitfalls: Deleting a project group is irreversible and does not delete the projects inside it; those projects remain in the account and become ungrouped. Deleting an unknown or already-deleted group still returns success.
 */
const action = createAction({
    description: 'Delete a project group (folder). Does not delete the projects inside it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md#delete-project-group
        await nango.delete({
            endpoint: `/open/v1/project/group/${encodeURIComponent(input.projectGroupId)}`,
            // Verified live: re-deleting an already-deleted group returns 200, so retrying a lost response is safe.
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
