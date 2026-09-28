import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    created_after: z.string()
});

const WorkflowRunSchema = z
    .object({
        id: z.string().describe('The unique identifier of the workflow run.'),
        name: z.string().optional().describe('The display name of the workflow run.'),
        head_branch: z.string().optional().describe('The branch that triggered the workflow run.'),
        head_sha: z.string().optional().describe('The SHA of the commit that triggered the workflow run.'),
        path: z.string().optional().describe('The path to the workflow file.'),
        run_number: z.number().describe('The run number of the workflow run.'),
        event: z.string().optional().describe('The event that triggered the workflow run.'),
        status: z.string().optional().describe('The current status of the workflow run.'),
        conclusion: z.string().optional().describe('The conclusion of the workflow run, if completed.'),
        workflow_id: z.number().describe('The ID of the workflow that generated this run.'),
        url: z.string().optional().describe('The API URL for the workflow run.'),
        html_url: z.string().optional().describe('The HTML URL for the workflow run.'),
        created_at: z.string().describe('The timestamp when the workflow run was created.'),
        updated_at: z.string().describe('The timestamp when the workflow run was last updated.')
    })
    .describe('A GitHub Actions workflow run for a repository.');

const ProviderWorkflowRunSchema = z.object({
    id: z.number(),
    name: z.string().nullish(),
    head_branch: z.string().nullish(),
    head_sha: z.string().nullish(),
    path: z.string().nullish(),
    run_number: z.number(),
    event: z.string().nullish(),
    status: z.string().nullish(),
    conclusion: z.string().nullable().optional(),
    workflow_id: z.number(),
    url: z.string().nullish(),
    html_url: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderRepositorySchema = z.object({
    owner: z.object({
        login: z.string()
    }),
    name: z.string()
});

const sync = createSync({
    description: 'Sync GitHub Actions workflow runs for a repository.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        WorkflowRun: WorkflowRunSchema
    },
    scopes: ['actions:read'],
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const isFirstRun = checkpoint == null;
        const createdAfter = isFirstRun ? undefined : checkpoint.created_after;

        const repos: Array<{ owner: { login: string }; name: string }> = [];
        // https://docs.github.com/rest/reference/apps#list-repositories-accessible-to-the-app-installation
        for await (const page of nango.paginate<unknown>({
            endpoint: '/installation/repositories',
            paginate: {
                type: 'link',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'repositories',
                link_rel_in_response_header: 'next'
            },
            retries: 3
        })) {
            for (const item of page) {
                const parsed = ProviderRepositorySchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse repository: ${parsed.error.message}`);
                }
                repos.push(parsed.data);
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesStart('WorkflowRun');
        }

        let maxCreatedAt: string | undefined = undefined;

        for (const repo of repos) {
            const owner = repo.owner.login;
            const name = repo.name;

            // https://docs.github.com/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
            for await (const page of nango.paginate<unknown>({
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/actions/runs`,
                params: createdAfter ? { created: `>${createdAfter}..*` } : {},
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'per_page',
                    limit: 100,
                    response_path: 'workflow_runs',
                    link_rel_in_response_header: 'next'
                },
                retries: 3
            })) {
                const runs = page.map((item) => {
                    const parsed = ProviderWorkflowRunSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse workflow run: ${parsed.error.message}`);
                    }
                    return parsed.data;
                });

                if (runs.length === 0) {
                    continue;
                }

                const mapped = runs.map((run) => ({
                    id: String(run.id),
                    ...(run.name != null && { name: run.name }),
                    ...(run.head_branch != null && { head_branch: run.head_branch }),
                    ...(run.head_sha != null && { head_sha: run.head_sha }),
                    ...(run.path != null && { path: run.path }),
                    run_number: run.run_number,
                    ...(run.event != null && { event: run.event }),
                    ...(run.status != null && { status: run.status }),
                    ...(run.conclusion != null && { conclusion: run.conclusion }),
                    workflow_id: run.workflow_id,
                    ...(run.url != null && { url: run.url }),
                    ...(run.html_url != null && { html_url: run.html_url }),
                    created_at: run.created_at,
                    updated_at: run.updated_at
                }));

                await nango.batchSave(mapped, 'WorkflowRun');

                for (const run of runs) {
                    if (maxCreatedAt === undefined || run.created_at > maxCreatedAt) {
                        maxCreatedAt = run.created_at;
                    }
                }
            }
        }

        if (isFirstRun) {
            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('WorkflowRun');
        }

        await nango.saveCheckpoint({
            created_after: maxCreatedAt ?? createdAfter ?? new Date().toISOString()
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
