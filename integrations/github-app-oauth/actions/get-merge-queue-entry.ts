import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "nango"'),
        pr_number: z.number().int().describe('The number that identifies the pull request to look up in the merge queue. Example: 1')
    })
    .describe('Repository and pull request identifying the merge queue entry to fetch');

const OutputSchema = z
    .object({
        found: z.boolean().describe('Whether a merge queue entry exists for the pull request.'),
        entry: z
            .object({
                id: z.string().describe('The global node ID of the merge queue entry.'),
                position: z.number().nullable().describe('The 1-based position of the entry in the merge queue, or null if unavailable.'),
                state: z.string().describe('The state of the entry, e.g. "QUEUED", "AWAITING_CHECKS", "MERGEABLE", "UNMERGEABLE", or "LOCKED".'),
                enqueued_at: z.string().nullable().describe('ISO 8601 timestamp of when the pull request was added to the merge queue.')
            })
            .optional()
            .describe('The merge queue entry details. Present only when found is true.')
    })
    .describe('Lookup result for the pull request merge queue entry');

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            repository: z
                .object({
                    pullRequest: z
                        .object({
                            mergeQueueEntry: z
                                .object({
                                    id: z.string(),
                                    position: z.number().nullable().optional(),
                                    state: z.string(),
                                    enqueuedAt: z.string().nullable().optional()
                                })
                                .nullable()
                        })
                        .nullable()
                })
                .nullable()
        })
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GraphQL query against the GitHub API and never modifies repository, pull request, or merge queue state.
 * @pitfalls: GitHub's REST API has no endpoint to look up a merge queue entry for a single pull request (verified against GitHub's public OpenAPI spec: no `/merge-queue-entry` or `/pulls/{n}/merge-queue` REST path exists). This is exposed only via the GraphQL API's `PullRequest.mergeQueueEntry` field, which this action queries instead. found:false covers both "the pull request is not enqueued" and "the repository has no merge queue enabled" — GraphQL returns null for mergeQueueEntry in both cases with no distinguishing signal.
 */
const action = createAction({
    description: 'Get the merge queue entry for a specific pull request, if the repository has a merge queue enabled.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/graphql/reference/objects#pullrequest
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `query($owner: String!, $repo: String!, $number: Int!) {
                    repository(owner: $owner, name: $repo) {
                        pullRequest(number: $number) {
                            mergeQueueEntry {
                                id
                                position
                                state
                                enqueuedAt
                            }
                        }
                    }
                }`,
                variables: {
                    owner: input.owner,
                    repo: input.repo,
                    number: input.pr_number
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join('; ')
            });
        }

        const mergeQueueEntry = parsed.data?.repository?.pullRequest?.mergeQueueEntry;

        if (!mergeQueueEntry) {
            return { found: false };
        }

        return {
            found: true,
            entry: {
                id: mergeQueueEntry.id,
                position: mergeQueueEntry.position ?? null,
                state: mergeQueueEntry.state,
                enqueued_at: mergeQueueEntry.enqueuedAt ?? null
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
