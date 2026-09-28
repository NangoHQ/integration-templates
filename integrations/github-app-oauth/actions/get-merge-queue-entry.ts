import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "nango"'),
        ref: z.string().describe('The base branch whose merge queue should be inspected, e.g. "main".'),
        pr_number: z.number().int().describe('The number that identifies the pull request to look up in the merge queue. Example: 1')
    })
    .describe('Repository, base branch and pull request identifying the merge queue entry to fetch');

const OutputSchema = z
    .object({
        found: z.boolean().describe('Whether a merge queue entry exists for the pull request on the given ref.'),
        entry: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('The merge queue entry payload exactly as returned by GitHub. Present only when found is true.')
    })
    .describe('Lookup result for the pull request merge queue entry');

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET against the GitHub API and never modifies repository, pull request, or merge queue state.
 * @pitfalls: found:false means GitHub returned a generic 404, which does not distinguish a base branch with no merge queue from a pull request that is simply not enqueued. Merge queues only exist when enabled through branch protection rules, so repositories without that setup will always return found:false.
 */
const action = createAction({
    description: 'Get the merge queue entry for a specific pull request, if the base branch has a merge queue enabled.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: GitHub returns 404 when no merge queue entry exists for the pull request (including when the ref has no merge queue at all); that expected outcome is translated into found:false instead of failing the action.
        try {
            // https://docs.github.com/en/rest
            response = await nango.get({
                endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/merge-queue-entry/${encodeURIComponent(input.ref)}/${input.pr_number}`,
                retries: 3
            });
        } catch (err) {
            const parsedError = HttpErrorSchema.safeParse(err);
            if (parsedError.success && parsedError.data.response.status === 404) {
                return { found: false };
            }
            throw err;
        }

        // The Nango proxy normally throws on 404 (handled above), but guard on the status too so mocked replays, which resolve with the recorded error response, behave identically.
        if (response.status === 404) {
            return { found: false };
        }

        const parsedEntry = z.record(z.string(), z.unknown()).safeParse(response.data);
        if (!parsedEntry.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response shape from the merge queue entry endpoint.'
            });
        }

        return { found: true, entry: parsedEntry.data };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
