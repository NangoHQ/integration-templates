import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { GithubRepoFile, GithubIssueRepoInput } from '../models.js';

enum Models {
    GithubRepoFile = 'GithubRepoFile'
}

const LIMIT = 100;

const sync = createSync({
    description: 'Lists all the files of a Github repo given a specific branch',
    version: '2.0.1',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/files',
            group: 'Files'
        }
    ],

    scopes: ['repo'],

    models: {
        GithubRepoFile: GithubRepoFile
    },

    metadata: GithubIssueRepoInput,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        
        if (!metadata?.owner || !metadata?.repo || !metadata?.branch) {
            throw Error('Missing required metadata: either owner, repo, or branch might be missing');
        }
        
        const { owner, repo, branch } = metadata;

        // On the first run, fetch all files. On subsequent runs, fetch only updated files.
        if (!nango.lastSyncDate) {
            await saveAllRepositoryFiles(nango, owner, repo, branch);
        } else {
            await saveFileUpdates(nango, owner, repo, nango.lastSyncDate);
        }
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
        paginate: { response_path: 'tree', limit: LIMIT }
    };

    await nango.log(`Fetching files from endpoint ${endpoint}.`);

    for await (const fileBatch of nango.paginate(proxyConfig)) {
        const blobFiles = fileBatch.filter((item: any) => item.type === 'blob');
        count += blobFiles.length;
        await nango.batchSave(blobFiles.map(mapToFile), Models.GithubRepoFile);
    }
    await nango.log(`Got ${count} file(s).`);
}

async function saveFileUpdates(nango: NangoSyncLocal, owner: string, repo: string, since: Date) {
    const commitsSinceLastSync: any[] = await getCommitsSinceLastSync(owner, repo, since, nango);

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

    const commitsSinceLastSync: any[] = [];
    for await (const commitBatch of nango.paginate(proxyConfig)) {
        count += commitBatch.length;
        commitsSinceLastSync.push(...commitBatch);
    }
    await nango.log(`Got ${count} commits(s).`);
    return commitsSinceLastSync;
}

async function saveFilesUpdatedByCommit(owner: string, repo: string, commitSummary: any, nango: NangoSyncLocal) {
    let count = 0;
    const endpoint = `/repos/${owner}/${repo}/commits/${commitSummary.sha}`;
    const proxyConfig: ProxyConfiguration = {
        // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit
        endpoint,
        paginate: {
            response_path: 'files',
            limit: LIMIT
        }
    };

    await nango.log(`Fetching files from endpoint ${endpoint}.`);

    for await (const fileBatch of nango.paginate(proxyConfig)) {
        count += fileBatch.length;
        await nango.batchSave(fileBatch.filter((file: any) => file.status !== 'removed').map(mapToFile), Models.GithubRepoFile);
        await nango.batchDelete(fileBatch.filter((file: any) => file.status === 'removed').map(mapToFile), Models.GithubRepoFile);
    }
    await nango.log(`Got ${count} file(s).`);
}

function mapToFile(file: any): GithubRepoFile {
    return {
        id: file.sha,
        name: file.path || file.filename,
        url: file.url || file.blob_url,
        last_modified_date: file.committer?.date ? new Date(file.committer?.date) : new Date() // Use commit date or current date
    };
}
