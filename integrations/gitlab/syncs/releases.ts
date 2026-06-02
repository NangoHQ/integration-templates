import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GitLabProjectSchema = z.object({
    id: z.number()
});

const GitLabReleaseSchema = z.object({
    tag_name: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string(),
    released_at: z.string(),
    author: z
        .object({
            id: z.number()
        })
        .optional(),
    commit: z
        .object({
            id: z.string()
        })
        .optional()
});

const ReleaseSchema = z.object({
    id: z.string(),
    project_id: z.number(),
    tag_name: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string(),
    released_at: z.string(),
    author_id: z.number().optional(),
    commit_id: z.string().optional()
});

const sync = createSync({
    description: 'Sync releases from GitLab.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/releases', group: 'Releases' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Release: ReleaseSchema
    },

    exec: async (nango) => {
        // Blocker: GitLab Releases List API does not support updated_after,
        // modified_since, or any changed-since filter, nor does it expose a
        // cursor or resumable page token for incremental sync. It only supports
        // standard offset pagination (page/per_page) with no change filtering.
        await nango.trackDeletesStart('Release');

        const projectsConfig: ProxyConfiguration = {
            // https://docs.gitlab.com/api/projects/#list-all-projects
            endpoint: '/api/v4/projects',
            params: {
                membership: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const projectBatch of nango.paginate(projectsConfig)) {
            for (const rawProject of projectBatch) {
                const project = GitLabProjectSchema.parse(rawProject);

                const releasesConfig: ProxyConfiguration = {
                    // https://docs.gitlab.com/api/releases/#list-releases
                    endpoint: `/api/v4/projects/${encodeURIComponent(String(project.id))}/releases`,
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'page',
                        offset_start_value: 1,
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'per_page',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const releaseBatch of nango.paginate(releasesConfig)) {
                    const mappedReleases = releaseBatch.map((rawRelease) => {
                        const release = GitLabReleaseSchema.parse(rawRelease);

                        return {
                            id: `${project.id}-${release.tag_name}`,
                            project_id: project.id,
                            tag_name: release.tag_name,
                            ...(release.name != null && { name: release.name }),
                            ...(release.description != null && { description: release.description }),
                            created_at: release.created_at,
                            released_at: release.released_at,
                            ...(release.author != null && { author_id: release.author.id }),
                            ...(release.commit != null && { commit_id: release.commit.id })
                        };
                    });

                    if (mappedReleases.length > 0) {
                        await nango.batchSave(mappedReleases, 'Release');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('Release');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
