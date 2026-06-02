import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCommitSchema = z.object({
    id: z.string().optional(),
    short_id: z.string().optional(),
    created_at: z.string().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional(),
    web_url: z.string().optional()
});

const ProviderBranchSchema = z.object({
    name: z.string(),
    merged: z.boolean().optional(),
    protected: z.boolean().optional(),
    default: z.boolean().optional(),
    developers_can_push: z.boolean().optional(),
    developers_can_merge: z.boolean().optional(),
    can_push: z.boolean().optional(),
    web_url: z.string().optional(),
    commit: ProviderCommitSchema.optional()
});

const ProviderProjectSchema = z.object({
    id: z.number().int()
});

const BranchSchema = z.object({
    id: z.string(),
    name: z.string(),
    project_id: z.string(),
    merged: z.boolean().optional(),
    protected: z.boolean().optional(),
    default: z.boolean().optional(),
    developers_can_push: z.boolean().optional(),
    developers_can_merge: z.boolean().optional(),
    can_push: z.boolean().optional(),
    web_url: z.string().optional(),
    commit_id: z.string().optional(),
    commit_short_id: z.string().optional(),
    commit_created_at: z.string().optional(),
    commit_title: z.string().optional(),
    commit_message: z.string().optional(),
    commit_author_name: z.string().optional(),
    commit_author_email: z.string().optional(),
    commit_authored_date: z.string().optional(),
    commit_committer_name: z.string().optional(),
    commit_committer_email: z.string().optional(),
    commit_committed_date: z.string().optional(),
    commit_web_url: z.string().optional()
});

const sync = createSync({
    description: 'Sync branches from GitLab',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Branch: BranchSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/branches'
        }
    ],

    exec: async (nango) => {
        // Blocker: GitLab branches API does not support filtering by updated timestamp,
        // cursor, or high-watermark ID. It only returns the full list of branches for a project.
        await nango.trackDeletesStart('Branch');

        const projectsConfig: ProxyConfiguration = {
            // https://docs.gitlab.com/api/projects/
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
                limit: 10
            },
            retries: 3
        };

        for await (const projectsPage of nango.paginate(projectsConfig)) {
            const projects = z.array(ProviderProjectSchema).safeParse(projectsPage);
            if (!projects.success) {
                throw new Error('Failed to parse projects response: ' + JSON.stringify(projects.error.issues));
            }

            for (const project of projects.data) {
                const projectId = String(project.id);

                const branchesConfig: ProxyConfiguration = {
                    // https://docs.gitlab.com/api/branches/
                    endpoint: '/api/v4/projects/' + encodeURIComponent(projectId) + '/repository/branches',
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

                for await (const branchesPage of nango.paginate(branchesConfig)) {
                    const branches = z.array(ProviderBranchSchema).safeParse(branchesPage);
                    if (!branches.success) {
                        throw new Error('Failed to parse branches response: ' + JSON.stringify(branches.error.issues));
                    }

                    const mapped = branches.data.map((branch) => ({
                        id: projectId + '/' + branch.name,
                        name: branch.name,
                        project_id: projectId,
                        ...(branch.merged !== undefined && { merged: branch.merged }),
                        ...(branch.protected !== undefined && { protected: branch.protected }),
                        ...(branch.default !== undefined && { default: branch.default }),
                        ...(branch.developers_can_push !== undefined && { developers_can_push: branch.developers_can_push }),
                        ...(branch.developers_can_merge !== undefined && { developers_can_merge: branch.developers_can_merge }),
                        ...(branch.can_push !== undefined && { can_push: branch.can_push }),
                        ...(branch.web_url != null && { web_url: branch.web_url }),
                        ...(branch.commit?.id != null && { commit_id: branch.commit.id }),
                        ...(branch.commit?.short_id != null && { commit_short_id: branch.commit.short_id }),
                        ...(branch.commit?.created_at != null && { commit_created_at: branch.commit.created_at }),
                        ...(branch.commit?.title != null && { commit_title: branch.commit.title }),
                        ...(branch.commit?.message != null && { commit_message: branch.commit.message }),
                        ...(branch.commit?.author_name != null && { commit_author_name: branch.commit.author_name }),
                        ...(branch.commit?.author_email != null && { commit_author_email: branch.commit.author_email }),
                        ...(branch.commit?.authored_date != null && { commit_authored_date: branch.commit.authored_date }),
                        ...(branch.commit?.committer_name != null && { commit_committer_name: branch.commit.committer_name }),
                        ...(branch.commit?.committer_email != null && { commit_committer_email: branch.commit.committer_email }),
                        ...(branch.commit?.committed_date != null && { commit_committed_date: branch.commit.committed_date }),
                        ...(branch.commit?.web_url != null && { commit_web_url: branch.commit.web_url })
                    }));

                    if (mapped.length > 0) {
                        await nango.batchSave(mapped, 'Branch');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('Branch');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
