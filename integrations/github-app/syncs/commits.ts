import type { NangoSync, ProxyConfiguration, GithubMetadataInput, GithubCommit } from '../../models.js';

import { RETRIES, DEFAULT_SYNC_WINDOW } from '../constants.js';
import { commitsQuery } from '../graphql/commits.js';
import { toCommit } from '../mappers/to-commit.js';
import { githubMetadataInputSchema } from '../schema.zod.js';
import type { CommitGraphQLResponse, CommitsQueryGraphQLResponse } from '../types';
import { shouldAbortSync } from '../helpers/exceed-time-limit-check.js';

interface CommitQueryVariables {
    owner: string;
    repo: string;
    branch?: string | undefined;
    since: string;
    cursor?: string | undefined;
}

export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<GithubMetadataInput>();
    await nango.zodValidateInput({ zodSchema: githubMetadataInputSchema, input: metadata });

    // Start the clock for 20 hours.
    const startTime = new Date();

    // Determine sync window in minutes (default to 2 years if not specified).
    const syncWindowMinutes = metadata.syncWindowMinutes ?? DEFAULT_SYNC_WINDOW;
    const syncWindow = new Date(Date.now() - syncWindowMinutes * 60 * 1000);

    // If the user provided a lastSyncDate, we combine that with our two-year (or custom) window.
    // We'll pick the *earliest* date among them to ensure we only fetch new commits.
    const cutoffDate = nango.lastSyncDate ?? syncWindow;

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
            return toCommit(node, metadata.branch);
        });

        if (mappedCommits.length > 0) {
            await nango.batchSave(mappedCommits, 'GithubCommit');
            await nango.log(`Saved batch of commits: ${mappedCommits.length} (Total so far: ${commitCount})`, { level: 'info' });
        }
    }

    await nango.log(`Total commits fetched: ${commitCount}`, { level: 'info' });
}
