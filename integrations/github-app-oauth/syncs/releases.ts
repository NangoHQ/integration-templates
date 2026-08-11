import { createSync } from 'nango';
import { z } from 'zod';

const ReleaseAssetSchema = z
    .object({
        id: z.number().describe('The unique numeric identifier of the release asset'),
        node_id: z.string().describe('The global node ID of the release asset'),
        name: z.string().describe('The file name of the release asset'),
        label: z.string().nullable().optional().describe('A short description of the release asset'),
        state: z.string().describe('The state of the release asset (e.g., uploaded)'),
        content_type: z.string().describe('The content type of the release asset (e.g., application/zip)'),
        size: z.number().describe('The size of the release asset in bytes'),
        download_count: z.number().describe('The number of times the asset has been downloaded'),
        created_at: z.string().describe('The ISO 8601 timestamp when the asset was created'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the asset was last updated'),
        browser_download_url: z.string().describe('The URL to download the asset via a browser'),
        uploader_login: z.string().optional().describe('The login of the user who uploaded the asset')
    })
    .describe('An asset attached to a GitHub release');

const ReleaseSchema = z
    .object({
        id: z.string().describe('The unique string identifier of the release'),
        node_id: z.string().optional().describe('The global node ID of the release'),
        tag_name: z.string().describe('The name of the git tag associated with the release'),
        target_commitish: z.string().describe('The commitish value that determines where the git tag is created from'),
        name: z.string().optional().describe('The name of the release'),
        body: z.string().optional().describe('The description of the release contents'),
        draft: z.boolean().describe('Whether the release is a draft'),
        prerelease: z.boolean().describe('Whether the release is a prerelease'),
        created_at: z.string().describe('The ISO 8601 timestamp when the release was created'),
        published_at: z.string().optional().describe('The ISO 8601 timestamp when the release was published'),
        author_login: z.string().optional().describe('The login of the user who authored the release'),
        author_id: z.number().optional().describe('The unique numeric identifier of the release author'),
        url: z.string().optional().describe('The API URL of the release'),
        html_url: z.string().optional().describe('The HTML URL of the release on GitHub'),
        tarball_url: z.string().optional().describe('The URL to download the release as a tarball'),
        zipball_url: z.string().optional().describe('The URL to download the release as a zipball'),
        upload_url: z.string().optional().describe('The URL to upload assets to for the release'),
        assets: z.array(ReleaseAssetSchema).optional().describe('The assets attached to the release')
    })
    .describe('A GitHub release for a repository');

const ProviderReleaseAssetSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    label: z.string().nullable().optional(),
    state: z.string(),
    content_type: z.string(),
    size: z.number(),
    download_count: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    browser_download_url: z.string(),
    uploader: z
        .object({
            login: z.string(),
            id: z.number()
        })
        .optional()
});

const ProviderReleaseSchema = z.object({
    id: z.number(),
    node_id: z.string().optional(),
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
        .optional(),
    url: z.string().optional(),
    html_url: z.string().optional(),
    tarball_url: z.string().optional(),
    zipball_url: z.string().optional(),
    upload_url: z.string().optional(),
    assets: z.array(ProviderReleaseAssetSchema).optional()
});

const sync = createSync({
    description: 'Sync releases for a repository.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Release: ReleaseSchema
    },

    exec: async (nango) => {
        // https://docs.github.com/rest/apps/installations#list-repositories-accessible-to-the-app-installation
        const reposConfig = {
            endpoint: '/installation/repositories',
            paginate: {
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'repositories'
            },
            retries: 3
        };

        const repos: Array<{ name: string; owner: { login: string } }> = [];
        for await (const batch of nango.paginate(reposConfig)) {
            for (const raw of batch) {
                const parsed = z
                    .object({
                        name: z.string(),
                        owner: z.object({ login: z.string() })
                    })
                    .safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse repository: ${parsed.error.message}`);
                }
                repos.push(parsed.data);
            }
        }

        if (repos.length === 0) {
            // An empty response may be transient rather than a genuine "installation has no
            // repositories" state. Skip the run instead of reconciling away every synced release.
            await nango.log('No repositories accessible to this installation; skipping this run.', { level: 'warn' });
            return;
        }

        await nango.trackDeletesStart('Release');

        for (const repo of repos) {
            const owner = repo.owner.login;
            const repoName = repo.name;

            // https://docs.github.com/rest/releases/releases#list-releases
            const releasesConfig = {
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/releases`,
                paginate: {
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const batch of nango.paginate(releasesConfig)) {
                const releases = [];
                for (const raw of batch) {
                    const parsed = ProviderReleaseSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse release: ${parsed.error.message}`);
                    }
                    const release = parsed.data;
                    releases.push({
                        id: String(release.id),
                        ...(release.node_id !== undefined && { node_id: release.node_id }),
                        tag_name: release.tag_name,
                        target_commitish: release.target_commitish,
                        ...(release.name != null && { name: release.name }),
                        ...(release.body != null && { body: release.body }),
                        draft: release.draft,
                        prerelease: release.prerelease,
                        created_at: release.created_at,
                        ...(release.published_at != null && { published_at: release.published_at }),
                        ...(release.author !== undefined && {
                            author_login: release.author.login,
                            author_id: release.author.id
                        }),
                        ...(release.url !== undefined && { url: release.url }),
                        ...(release.html_url !== undefined && { html_url: release.html_url }),
                        ...(release.tarball_url !== undefined && { tarball_url: release.tarball_url }),
                        ...(release.zipball_url !== undefined && { zipball_url: release.zipball_url }),
                        ...(release.upload_url !== undefined && { upload_url: release.upload_url }),
                        ...(release.assets !== undefined && {
                            assets: release.assets.map((asset) => ({
                                id: asset.id,
                                node_id: asset.node_id,
                                name: asset.name,
                                ...(asset.label != null && { label: asset.label }),
                                state: asset.state,
                                content_type: asset.content_type,
                                size: asset.size,
                                download_count: asset.download_count,
                                created_at: asset.created_at,
                                updated_at: asset.updated_at,
                                browser_download_url: asset.browser_download_url,
                                ...(asset.uploader !== undefined && { uploader_login: asset.uploader.login })
                            }))
                        })
                    });
                }

                if (releases.length > 0) {
                    await nango.batchSave(releases, 'Release');
                }
            }
        }

        await nango.trackDeletesEnd('Release');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
