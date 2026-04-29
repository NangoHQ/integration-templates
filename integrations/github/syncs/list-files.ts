import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const MetadataSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string()
});

const GithubRepoFileSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    last_modified_date: z.date()
});

const CheckpointSchema = z.object({
    synced_at: z.string()
});

const TreeItemSchema = z.object({
    path: z.string(),
    type: z.string(),
    sha: z.string(),
    url: z.string()
});

const CommitSummarySchema = z.object({
    sha: z.string()
});

const CommitFileSchema = z.object({
    filename: z.string(),
    status: z.string(),
    sha: z.string(),
    blob_url: z.string(),
    committer: z.object({ date: z.string() }).optional()
});

const sync = createSync({
    description: 'Lists all the files of a Github repo given a specific branch',
    version: '2.0.2',
    frequency: 'every hour',
    autoStart: false,

    endpoints: [
        {
            method: 'GET',
            path: '/files',
            group: 'Files'
        }
    ],

    scopes: ['repo'],

    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,

    models: {
        GithubRepoFile: GithubRepoFileSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);
        const { owner, repo, branch } = metadata;

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;

        const syncStartedAt = new Date().toISOString();

        if (!checkpoint) {
            await saveAllRepositoryFiles(nango, owner, repo, branch);
        } else {
            await saveFileUpdates(nango, owner, repo, new Date(checkpoint.synced_at));
        }

        await nango.saveCheckpoint({ synced_at: syncStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function saveAllRepositoryFiles(nango: NangoSyncLocal, owner: string, repo: string, branch: string) {
    let count = 0;

    const endpoint = `/repos/${owner}/${repo}/git/trees/${branch}`;
    const proxyConfig: ProxyConfiguration = {
        // https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28
        endpoint,
        params: { recursive: '1' },
        paginate: { response_path: 'tree', limit: LIMIT },
        retries: 3
    };

    await nango.log(`Fetching files from endpoint ${endpoint}.`);

    for await (const fileBatch of nango.paginate<z.infer<typeof TreeItemSchema>>(proxyConfig)) {
        const blobFiles = fileBatch.filter((item) => item.type === 'blob');
        count += blobFiles.length;
        await nango.batchSave(blobFiles.map(mapToFile), 'GithubRepoFile');
    }
    await nango.log(`Got ${count} file(s).`);
}

async function saveFileUpdates(nango: NangoSyncLocal, owner: string, repo: string, since: Date) {
    const commitsSinceLastSync = await getCommitsSinceLastSync(owner, repo, since, nango);

    for (const commitSummary of commitsSinceLastSync) {
        await saveFilesUpdatedByCommit(owner, repo, commitSummary, nango);
    }
}

async function getCommitsSinceLastSync(owner: string, repo: string, since: Date, nango: NangoSyncLocal) {
    let count = 0;
    const endpoint = `/repos/${owner}/${repo}/commits`;

    const proxyConfig: ProxyConfiguration = {
        // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28
        endpoint,
        params: { since: since.toISOString() },
        paginate: {
            limit: LIMIT
        }
    };

    await nango.log(`Fetching commits from endpoint ${endpoint}.`);

    const commitsSinceLastSync: z.infer<typeof CommitSummarySchema>[] = [];
    for await (const commitBatch of nango.paginate<z.infer<typeof CommitSummarySchema>>(proxyConfig)) {
        count += commitBatch.length;
        commitsSinceLastSync.push(...commitBatch);
    }
    await nango.log(`Got ${count} commits(s).`);
    return commitsSinceLastSync;
}

async function saveFilesUpdatedByCommit(owner: string, repo: string, commitSummary: z.infer<typeof CommitSummarySchema>, nango: NangoSyncLocal) {
    let count = 0;
    const endpoint = `/repos/${owner}/${repo}/commits/${commitSummary.sha}`;
    const proxyConfig: ProxyConfiguration = {
        // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit
        endpoint,
        paginate: {
            response_path: 'files',
            limit: LIMIT
        },
        retries: 3
    };

    await nango.log(`Fetching files from endpoint ${endpoint}.`);

    for await (const fileBatch of nango.paginate<z.infer<typeof CommitFileSchema>>(proxyConfig)) {
        count += fileBatch.length;
        await nango.batchSave(fileBatch.filter((file) => file.status !== 'removed').map(mapToFile), 'GithubRepoFile');
        await nango.batchDelete(fileBatch.filter((file) => file.status === 'removed').map(mapToFile), 'GithubRepoFile');
    }
    await nango.log(`Got ${count} file(s).`);
}

function mapToFile(file: z.infer<typeof TreeItemSchema> | z.infer<typeof CommitFileSchema>): z.infer<typeof GithubRepoFileSchema> {
    return {
        id: file.sha,
        name: 'path' in file ? file.path : file.filename,
        url: 'url' in file ? file.url : file.blob_url,
        last_modified_date: 'committer' in file && file.committer?.date ? new Date(file.committer.date) : new Date()
    };
}
