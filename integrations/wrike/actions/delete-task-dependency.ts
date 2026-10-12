import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        dependencyId: z
            .string()
            .describe(
                'Composite dependency link ID to remove (for example "MgAAAAERG-AHMwAAAAERG-AK"), not either task ID. Get it from create-task-dependency or list-task-dependencies.'
            )
    })
    .describe('Identifies the dependency link to remove.');

const ProviderResponseSchema = z.object({
    kind: z.string()
});

const OutputSchema = z
    .object({
        kind: z.string().describe('Provider response kind, always "dependencies" for this endpoint.'),
        dependencyId: z.string().describe('The dependency link ID that was removed.'),
        deleted: z.boolean().describe('True once the provider confirms the dependency link has been removed.')
    })
    .describe('Confirmation that the dependency link was removed.');

/**
 * @tags: [write, destructive]
 * @tagReason: Removes an existing dependency link with a provider DELETE call, a difficult-to-reverse mutation.
 * @pitfalls: Deleting an already-removed dependency fails with a provider error rather than succeeding idempotently, so a repeated or retried call can throw even though the link is already gone.
 */
const action = createAction({
    description: 'Remove a dependency link between two tasks (does not affect either task itself).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.wrike.com/reference/deletedependenciessingle
            endpoint: `/dependencies/${encodeURIComponent(input.dependencyId)}`,
            // Not replayable: a retry after a lost response gets a 404 for the already-removed link, masking a successful delete.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            kind: parsed.kind,
            dependencyId: input.dependencyId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
