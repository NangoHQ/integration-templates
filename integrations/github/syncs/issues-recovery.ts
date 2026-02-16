import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { GithubIssue } from '../models.js';
import { z } from 'zod';

/**
 * Tutorial sync: resilient long-running incremental syncs.
 *
 * The reusable pattern is:
 * 1) Persist recovery state before processing.
 * 2) Process deterministic chunks (offset-based).
 * 3) Save progress after each chunk.
 * 4) Exit safely before 24h and resume on next run.
 * 5) Clear recovery state only after successful completion.
 */
const LIMIT = 100;
const MAX_RUNTIME_MS = 23.5 * 60 * 60 * 1000;

type GithubRepository = {
    name: string;
    owner: {
        login: string;
    };
};

type GithubIssueApiResponse = {
    id: number;
    number: number;
    title: string;
    state: string;
    body: string | null;
    created_at: string;
    updated_at: string;
    user: {
        id: number;
        login: string;
    } | null;
    pull_request?: Record<string, unknown>;
};

const InternalRecoveryState = z.object({
    lastOffset: z.number().int().nonnegative().nullish(),
    lastSyncDate: z.string().nullish(),
    runStartTime: z.string().nullish()
});

const SyncMetadata = z.object({
    max_repositories_per_execution: z.number().int().positive().optional().describe('Optional cap for demo/testing. Example: 50'),
    _nango_internal: InternalRecoveryState.optional()
});

const sync = createSync({
    description: 'Demonstrates long-running sync recovery by persisting offset, sync window and run start timestamp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/github/issues-recovery'
        }
    ],

    scopes: ['public_repo'],

    models: {
        GithubIssue: GithubIssue
    },

    metadata: SyncMetadata,

    exec: async (nango) => {
        // Step 1: Load current metadata and read the persisted recovery state.
        const metadata = await nango.getMetadata<z.infer<typeof SyncMetadata>>();
        const internal = metadata?._nango_internal;
        let lastOffset = internal?.lastOffset ?? 0;

        // Step 2: Freeze the incremental window. We persist lastSyncDate once and keep it stable
        // across retries/resumes so "what this run is syncing" never changes mid-run.
        const persistedLastSyncDate = internal?.lastSyncDate ?? null;
        const frozenLastSyncDate = persistedLastSyncDate ?? nango.lastSyncDate?.toISOString() ?? null;

        // Step 3: Track the beginning of this long-running execution.
        let runStartTime = internal?.runStartTime ?? null;
        if (!runStartTime) {
            runStartTime = new Date().toISOString();
        }

        // Step 4: Persist state before doing work, so a crash can resume from known values.
        await nango.updateMetadata({
            ...(metadata ?? {}),
            _nango_internal: {
                lastOffset,
                lastSyncDate: frozenLastSyncDate,
                runStartTime
            }
        });

        // Step 5: Determine the work set for this execution.
        const startMs = new Date(runStartTime).getTime();
        const repositories = await getAllRepositories(nango);
        const maxRepositories = metadata?.max_repositories_per_execution ?? repositories.length;
        const stopAt = Math.min(repositories.length, lastOffset + maxRepositories);
        let savedIssues = 0;
        let processedRepositories = 0;

        if (lastOffset > 0) {
            await nango.log(`Resuming long-running sync from repository offset ${lastOffset}`);
        }

        // Step 6: Process one chunk at a time and checkpoint after each chunk.
        for (let repositoryIndex = lastOffset; repositoryIndex < stopAt; repositoryIndex++) {
            const elapsedMs = Date.now() - startMs;
            if (elapsedMs >= MAX_RUNTIME_MS) {
                // Step 6a: Safe timeout path. Save enough state to resume and exit cleanly.
                await nango.updateMetadata({
                    ...(metadata ?? {}),
                    _nango_internal: {
                        lastOffset: repositoryIndex,
                        lastSyncDate: frozenLastSyncDate,
                        runStartTime: null
                    }
                });
                await nango.log(
                    `Approaching 24h execution limit. Saved progress at offset ${repositoryIndex}. ` +
                        `Processed ${processedRepositories} repositories and saved ${savedIssues} issues.`,
                    { level: 'warn' }
                );
                return;
            }

            const repository = repositories[repositoryIndex];
            if (!repository) {
                break;
            }
            const issuesSavedForRepository = await syncRepositoryIssues(nango, repository, frozenLastSyncDate);

            processedRepositories += 1;
            savedIssues += issuesSavedForRepository;
            lastOffset = repositoryIndex + 1;

            // Step 6b: Crash-safe checkpoint written after each repository.
            await nango.updateMetadata({
                ...(metadata ?? {}),
                _nango_internal: {
                    lastOffset,
                    lastSyncDate: frozenLastSyncDate,
                    runStartTime
                }
            });
        }

        // Step 7: Success path. Clear internal state so next run starts from a fresh window.
        await nango.updateMetadata({
            ...(metadata ?? {}),
            _nango_internal: {
                lastOffset: null,
                lastSyncDate: null,
                runStartTime: null
            }
        });

        await nango.log(`Recovery sync completed. Processed ${processedRepositories} repositories and saved ${savedIssues} issues.`);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

// Provider-specific fetch helper. In your own integration, replace with your own "list chunks" call.
async function getAllRepositories(nango: NangoSyncLocal): Promise<GithubRepository[]> {
    const repositories: GithubRepository[] = [];
    const proxyConfig: ProxyConfiguration = {
        // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repositories-for-the-authenticated-user
        endpoint: '/user/repos',
        retries: 10,
        paginate: {
            limit: LIMIT
        }
    };

    for await (const repositoryBatch of nango.paginate(proxyConfig)) {
        for (const repository of repositoryBatch) {
            if (isGithubRepository(repository)) {
                repositories.push(repository);
            }
        }
    }

    return repositories;
}

// Provider-specific chunk processor. The recovery strategy does not depend on this logic.
async function syncRepositoryIssues(nango: NangoSyncLocal, repository: GithubRepository, frozenLastSyncDate: string | null): Promise<number> {
    const proxyConfig: ProxyConfiguration = {
        // https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues
        endpoint: `/repos/${repository.owner.login}/${repository.name}/issues`,
        retries: 10,
        params: {
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            ...(frozenLastSyncDate ? { since: frozenLastSyncDate } : {})
        },
        paginate: {
            limit: LIMIT
        }
    };

    let savedCount = 0;

    for await (const issueBatch of nango.paginate(proxyConfig)) {
        const mappedIssues = issueBatch
            .filter(isGithubIssueApiResponse)
            .filter((issue) => !issue.pull_request)
            .map((issue) => ({
                id: issue.id.toString(),
                owner: repository.owner.login,
                repo: repository.name,
                issue_number: issue.number,
                title: issue.title,
                state: issue.state,
                author: issue.user?.login ?? '',
                author_id: issue.user?.id?.toString() ?? '',
                body: issue.body ?? '',
                date_created: new Date(issue.created_at),
                date_last_modified: new Date(issue.updated_at)
            }));

        if (mappedIssues.length > 0) {
            await nango.batchSave(mappedIssues, 'GithubIssue');
            savedCount += mappedIssues.length;
        }
    }

    await nango.log(`Processed ${repository.owner.login}/${repository.name}: saved ${savedCount} issues for this repository.`);

    return savedCount;
}

function isGithubRepository(value: unknown): value is GithubRepository {
    if (!isObject(value)) {
        return false;
    }

    if (typeof value['name'] !== 'string') {
        return false;
    }

    if (!isObject(value['owner'])) {
        return false;
    }

    return typeof value['owner']['login'] === 'string';
}

function isGithubIssueApiResponse(value: unknown): value is GithubIssueApiResponse {
    if (!isObject(value)) {
        return false;
    }

    const hasValidUser =
        value['user'] === null || (isObject(value['user']) && typeof value['user']['id'] === 'number' && typeof value['user']['login'] === 'string');

    return (
        typeof value['id'] === 'number' &&
        typeof value['number'] === 'number' &&
        typeof value['title'] === 'string' &&
        typeof value['state'] === 'string' &&
        (value['body'] === null || typeof value['body'] === 'string') &&
        typeof value['created_at'] === 'string' &&
        typeof value['updated_at'] === 'string' &&
        hasValidUser
    );
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
