import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ReleaseSchema = z
    .object({
        id: z.string().describe('The unique identifier of the release, stable across the GitHub platform.'),
        node_id: z.string().describe("The global node ID for the release in GitHub's GraphQL API."),
        tag_name: z.string().describe('The git tag associated with this release.'),
        target_commitish: z.string().describe('The branch or commit SHA the release targets.'),
        name: z.string().optional().describe('The title of the release.'),
        body: z.string().optional().describe('The release notes body written in markdown.'),
        draft: z.boolean().describe('Whether the release is a draft and not yet published.'),
        prerelease: z.boolean().describe('Whether the release is a pre-release version.'),
        created_at: z.string().describe('ISO 8601 timestamp when the release was created.'),
        published_at: z.string().optional().describe('ISO 8601 timestamp when the release was published, omitted if still a draft.'),
        author_login: z.string().optional().describe('The GitHub login of the user who created the release.'),
        author_id: z.string().optional().describe('The unique identifier of the release author.'),
        url: z.string().describe('The REST API URL for this release resource.'),
        html_url: z.string().describe('The web URL for this release on GitHub.'),
        tarball_url: z.string().optional().describe('The URL to download the source code as a tar.gz archive.'),
        zipball_url: z.string().optional().describe('The URL to download the source code as a zip archive.')
    })
    .describe('A GitHub release published in a repository, including metadata, tag details, and download URLs.');

const CheckpointSchema = z.object({
    repo_full_name: z.string(),
    page: z.number().int().positive()
});

const GitHubRepoSchema = z.object({
    full_name: z.string(),
    owner: z.object({
        login: z.string()
    }),
    name: z.string()
});

const GitHubReleaseSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    tag_name: z.string(),
    target_commitish: z.string(),
    name: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    created_at: z.string(),
    published_at: z.string().nullable().optional(),
    author: z
        .object({
            login: z.string(),
            id: z.number()
        })
        .nullable()
        .optional(),
    url: z.string(),
    html_url: z.string(),
    tarball_url: z.string().nullable().optional(),
    zipball_url: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync releases for a repository.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Release: ReleaseSchema
    },
    scopes: ['contents:read'],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse({
            repo_full_name: '',
            page: 1,
            ...(rawCheckpoint && typeof rawCheckpoint === 'object' ? rawCheckpoint : {})
        });

        // https://docs.github.com/en/rest/apps/installations?apiVersion=2022-11-28#list-repositories-accessible-to-the-app-installation
        const reposConfig = {
            endpoint: '/installation/repositories',
            paginate: {
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'repositories'
            },
            retries: 3
        };

        const repos: Array<z.infer<typeof GitHubRepoSchema>> = [];
        for await (const repoBatch of nango.paginate(reposConfig)) {
            const parsed = z.array(GitHubRepoSchema).parse(repoBatch);
            repos.push(...parsed);
        }

        await nango.trackDeletesStart('Release');

        const checkpointRepoFullName = checkpoint.repo_full_name ?? repos[0]?.full_name;
        const resumeRepoIndex = checkpointRepoFullName
            ? Math.max(
                  repos.findIndex((repo) => repo.full_name === checkpointRepoFullName),
                  0
              )
            : 0;

        for (let repoIndex = resumeRepoIndex; repoIndex < repos.length; repoIndex++) {
            const repo = repos[repoIndex];
            if (!repo) {
                continue;
            }
            const owner = repo.owner.login;
            const repoName = repo.name;
            const repoFullName = repo.full_name;
            let currentPage = repoFullName === checkpointRepoFullName ? checkpoint.page : 1;

            const releasesConfig: ProxyConfiguration = {
                // https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/releases`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: currentPage,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const releaseBatch of nango.paginate(releasesConfig)) {
                const parsed = z.array(GitHubReleaseSchema).parse(releaseBatch);
                const releases = parsed.map((release) => ({
                    id: String(release.id),
                    node_id: release.node_id,
                    tag_name: release.tag_name,
                    target_commitish: release.target_commitish,
                    ...(release.name != null && { name: release.name }),
                    ...(release.body != null && { body: release.body }),
                    draft: release.draft,
                    prerelease: release.prerelease,
                    created_at: release.created_at,
                    ...(release.published_at != null && { published_at: release.published_at }),
                    ...(release.author != null && { author_login: release.author.login }),
                    ...(release.author != null && { author_id: String(release.author.id) }),
                    url: release.url,
                    html_url: release.html_url,
                    ...(release.tarball_url != null && { tarball_url: release.tarball_url }),
                    ...(release.zipball_url != null && { zipball_url: release.zipball_url })
                }));

                if (releases.length > 0) {
                    await nango.batchSave(releases, 'Release');
                }

                currentPage += 1;
                await nango.saveCheckpoint({ repo_full_name: repoFullName, page: currentPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Release');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
