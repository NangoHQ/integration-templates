import { createSync } from 'nango';

import { RETRIES, DEFAULT_SYNC_WINDOW } from '../constants.js';
import { commitsQuery } from '../graphql/commits.js';
import { toCommit } from '../mappers/to-commit.js';
import { githubMetadataInputSchema } from '../schema.zod.js';
import type { CommitGraphQLResponse, CommitsQueryGraphQLResponse } from '../types.js';
import { shouldAbortSync } from '../helpers/exceed-time-limit-check.js';

import type { ProxyConfiguration } from 'nango';
import { GithubCommit, GithubMetadataInput } from '../models.js';

import { z } from 'zod';
interface CommitQueryVariables {
    owner: string;
    repo: string;
    branch?: string | undefined;
    since: string;
    cursor?: string | undefined;
}

const CheckpointSchema = z.object({
    since: z.string()
});

const getLaterTimestamp = (current: string | undefined, candidate: string): string => {
    if (!current) {
        return candidate;
    }

    return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
};

const toOverlappingCheckpoint = (timestamp: string): string => {
    return new Date(new Date(timestamp).getTime() - 1000).toISOString();
};

const sync = createSync({
    description: 'Get all pull commits from a Github repository.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/commits',
            group: 'Commits'
        }
    ],

    models: {
        GithubCommit: GithubCommit
    },

    metadata: GithubMetadataInput,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const metadata = await nango.getMetadata();
        await nango.zodValidateInput({ zodSchema: githubMetadataInputSchema, input: metadata });

        // Start the clock for 20 hours.
        const startTime = new Date();

        // Determine sync window in minutes (default to 2 years if not specified).
        const syncWindowMinutes = metadata.syncWindowMinutes ?? DEFAULT_SYNC_WINDOW;
        const syncWindow = new Date(Date.now() - syncWindowMinutes * 60 * 1000);

        const cutoffDate = checkpoint?.since ? new Date(checkpoint.since) : syncWindow;

        const variables: CommitQueryVariables = {
            owner: metadata.owner,
            repo: metadata.repo,
            branch: metadata.branch,
            since: cutoffDate.toISOString()
        };

        await nango.log(`Fetching commits for ${metadata.repo} using GraphQL`, {
            level: 'info'
        });

        let hasNextPage = true;
        let cursor: string | undefined;
        let commitCount = 0;
        let latestCommitTimestamp: string | undefined;

        while (hasNextPage) {
            if (shouldAbortSync(startTime)) {
                await nango.log('Aborting sync due to 20 hours time limit', { level: 'warn' });
                break;
            }
            if (cursor) {
                variables['cursor'] = cursor;
            } else {
                variables['cursor'] = undefined;
            }

            const config: ProxyConfiguration = {
                // https://docs.github.com/en/graphql/overview/explorer
                // https://docs.github.com/en/graphql/guides/migrating-from-rest-to-graphql
                endpoint: `/graphql`,
                retries: RETRIES,
                data: {
                    query: commitsQuery(metadata.branch),
                    variables
                }
            };

            const response = await nango.post<CommitsQueryGraphQLResponse>(config);
            const repository = response.data?.data?.repository;

            if (!repository) {
                await nango.log(`Repository not found. Full response: ${JSON.stringify(response.data, null, 2)}`, { level: 'error' });
                break;
            }

            // "ref" if a branch was specified, otherwise "defaultBranchRef"
            const branchData = repository.ref ?? repository.defaultBranchRef;
            if (!branchData?.target) {
                await nango.log('Branch or commit not found', { level: 'error' });
                break;
            }

            const commits = branchData.target.history?.nodes ?? [];
            const pageInfo = branchData.target.history?.pageInfo;
            hasNextPage = !!pageInfo?.hasNextPage;
            cursor = pageInfo?.endCursor;

            const mappedCommits: GithubCommit[] = commits.map((node: CommitGraphQLResponse) => {
                commitCount++;
                latestCommitTimestamp = getLaterTimestamp(latestCommitTimestamp, node.authoredDate);
                return toCommit(node, metadata.branch);
            });

            if (mappedCommits.length > 0) {
                await nango.batchSave(mappedCommits, 'GithubCommit');
                await nango.log(`Saved batch of commits: ${mappedCommits.length} (Total so far: ${commitCount})`, { level: 'info' });
            }
        }

        await nango.log(`Total commits fetched: ${commitCount}`, { level: 'info' });
        if (latestCommitTimestamp) {
            await nango.saveCheckpoint({ since: toOverlappingCheckpoint(latestCommitTimestamp) });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
