import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    repositories: z
        .array(
            z.object({
                project: z.string(),
                repositoryId: z.string()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ProjectsResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(ProjectSchema).optional()
});

const RepositorySchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const RepositoriesResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(RepositorySchema).optional()
});

const ProviderCommitSchema = z.object({
    commitId: z.string(),
    author: z
        .object({
            name: z.string().optional(),
            email: z.string().optional(),
            date: z.string().optional()
        })
        .optional(),
    committer: z
        .object({
            name: z.string().optional(),
            email: z.string().optional(),
            date: z.string().optional()
        })
        .optional(),
    comment: z.string().optional(),
    remoteUrl: z.string().optional()
});

const ProviderCommitsResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(ProviderCommitSchema).optional()
});

const CommitSchema = z.object({
    id: z.string(),
    commitId: z.string(),
    repositoryId: z.string(),
    project: z.string(),
    authorName: z.string().optional(),
    authorEmail: z.string().optional(),
    authorDate: z.string().optional(),
    committerName: z.string().optional(),
    committerEmail: z.string().optional(),
    committerDate: z.string().optional(),
    comment: z.string().optional(),
    remoteUrl: z.string().optional()
});

const sync = createSync({
    description: 'Sync Git commits across repositories with incremental date filtering.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/commits',
            method: 'GET'
        }
    ],
    models: {
        Commit: CommitSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const metadata = await nango.getMetadata();

        let repositories: Array<{ project: string; repositoryId: string }> = [];
        if (metadata?.repositories && metadata.repositories.length > 0) {
            repositories = metadata.repositories;
        } else {
            let projectsContinuationToken: string | undefined;
            do {
                // https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list?view=azure-devops-rest-7.2
                const projectsResponse = await nango.get({
                    endpoint: '/_apis/projects',
                    params: {
                        'api-version': '7.2-preview.1',
                        ...(projectsContinuationToken && { continuationToken: projectsContinuationToken })
                    },
                    retries: 3
                });

                const projectsParsed = ProjectsResponseSchema.safeParse(projectsResponse.data);
                if (!projectsParsed.success) {
                    throw new Error(`Failed to parse projects response: ${projectsParsed.error.message}`);
                }

                const projects = projectsParsed.data.value ?? [];
                for (const project of projects) {
                    // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/list?view=azure-devops-rest-7.2
                    const reposResponse = await nango.get({
                        endpoint: `/${encodeURIComponent(project.id)}/_apis/git/repositories`,
                        params: {
                            'api-version': '7.2-preview.1'
                        },
                        retries: 3
                    });

                    const reposParsed = RepositoriesResponseSchema.safeParse(reposResponse.data);
                    if (!reposParsed.success) {
                        throw new Error(`Failed to parse repositories response for project ${project.id}: ${reposParsed.error.message}`);
                    }

                    const repos = reposParsed.data.value ?? [];
                    for (const repo of repos) {
                        repositories.push({
                            project: project.id,
                            repositoryId: repo.id
                        });
                    }
                }
                const rawProjToken = projectsResponse.headers['x-ms-continuationtoken'];
                projectsContinuationToken = Array.isArray(rawProjToken) ? rawProjToken[0] : typeof rawProjToken === 'string' ? rawProjToken : undefined;
            } while (projectsContinuationToken);
        }

        let maxCommitDate: string | undefined;
        const updatedAfter = checkpoint?.['updated_after'];

        for (const repo of repositories) {
            let continuationToken: string | undefined;
            let skip = 0;
            const top = 100;

            while (true) {
                const params: Record<string, string | number | string[] | number[]> = {
                    'api-version': '7.2-preview.1',
                    'searchCriteria.$top': top
                };

                if (typeof updatedAfter === 'string') {
                    params['searchCriteria.fromDate'] = updatedAfter;
                }

                if (typeof continuationToken === 'string') {
                    params['continuationToken'] = continuationToken;
                } else {
                    params['searchCriteria.$skip'] = skip;
                }

                // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/commits/get-commits?view=azure-devops-rest-7.2
                const response = await nango.get({
                    endpoint: `/${encodeURIComponent(repo.project)}/_apis/git/repositories/${encodeURIComponent(repo.repositoryId)}/commits`,
                    params,
                    retries: 3
                });

                const parsed = ProviderCommitsResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse commits response: ${parsed.error.message}`);
                }

                const commits = parsed.data.value ?? [];
                if (commits.length === 0) {
                    break;
                }

                const mappedCommits = commits.map((commit) => {
                    const commitDate = commit.committer?.date ?? commit.author?.date;
                    if (commitDate && (maxCommitDate === undefined || commitDate > maxCommitDate)) {
                        maxCommitDate = commitDate;
                    }

                    return {
                        id: `${repo.repositoryId}/${commit.commitId}`,
                        commitId: commit.commitId,
                        repositoryId: repo.repositoryId,
                        project: repo.project,
                        ...(commit.author?.name != null && { authorName: commit.author.name }),
                        ...(commit.author?.email != null && { authorEmail: commit.author.email }),
                        ...(commit.author?.date != null && { authorDate: commit.author.date }),
                        ...(commit.committer?.name != null && { committerName: commit.committer.name }),
                        ...(commit.committer?.email != null && { committerEmail: commit.committer.email }),
                        ...(commit.committer?.date != null && { committerDate: commit.committer.date }),
                        ...(commit.comment != null && { comment: commit.comment }),
                        ...(commit.remoteUrl != null && { remoteUrl: commit.remoteUrl })
                    };
                });

                await nango.batchSave(mappedCommits, 'Commit');

                const nextToken = response.headers['x-ms-continuationtoken'];
                if (typeof nextToken === 'string' && nextToken.length > 0) {
                    continuationToken = nextToken;
                    skip += commits.length;
                } else {
                    break;
                }
            }
        }

        if (maxCommitDate) {
            await nango.saveCheckpoint({ updated_after: maxCommitDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
