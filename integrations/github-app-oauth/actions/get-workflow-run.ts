import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username or organization name. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        run_id: z.number().describe('Unique identifier of the workflow run to retrieve. Example: 31522802177')
    })
    .describe('Input parameters to retrieve a single GitHub Actions workflow run');

const ActorSchema = z.object({
    login: z.string().describe('GitHub username of the actor'),
    id: z.number().describe('GitHub user ID of the actor'),
    avatar_url: z.string().describe("URL of the actor's avatar image"),
    html_url: z.string().describe('GitHub profile URL of the actor'),
    type: z.string().describe('Type of actor, e.g. "Bot" or "User"')
});

const CommitAuthorSchema = z.object({
    name: z.string().describe('Name of the commit author or committer'),
    email: z.string().describe('Email of the commit author or committer')
});

const HeadCommitSchema = z.object({
    id: z.string().describe('SHA of the head commit'),
    message: z.string().describe('Commit message'),
    timestamp: z.string().describe('Commit timestamp in ISO 8601 format'),
    author: CommitAuthorSchema.describe('Commit author information'),
    committer: CommitAuthorSchema.describe('Commit committer information')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the workflow run'),
        name: z.string().describe('Name of the workflow'),
        head_branch: z.string().describe('Branch on which the run was triggered'),
        head_sha: z.string().describe('SHA of the commit that triggered the run'),
        path: z.string().describe('Path to the workflow file'),
        display_title: z.string().describe('Display title of the run'),
        run_number: z.number().describe('Run number for this workflow'),
        event: z.string().describe('GitHub event that triggered the run'),
        status: z.string().describe('Current status of the run, e.g. "queued", "in_progress", "completed"'),
        conclusion: z.string().nullable().describe('Conclusion of the run, e.g. "success", "failure", or null if not completed'),
        workflow_id: z.number().describe('ID of the workflow definition'),
        url: z.string().describe('API URL for this workflow run'),
        html_url: z.string().describe('GitHub web URL for this workflow run'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format'),
        run_started_at: z.string().describe('When the run started in ISO 8601 format'),
        run_attempt: z.number().describe('Attempt number for this run'),
        jobs_url: z.string().describe('API URL for the jobs in this run'),
        logs_url: z.string().describe('API URL for the run logs'),
        artifacts_url: z.string().describe('API URL for the run artifacts'),
        cancel_url: z.string().describe('API URL to cancel this run'),
        rerun_url: z.string().describe('API URL to rerun this run'),
        actor: ActorSchema.describe('User or bot that triggered the run'),
        head_commit: HeadCommitSchema.describe('Head commit for this run')
    })
    .describe('Details and status of a single GitHub Actions workflow run');

/**
 * @tags: [read]
 * @tagReason: Reads the details and status of a single workflow run from the GitHub API.
 */
const action = createAction({
    description: 'Get details and status of a single workflow run',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/rest/actions/workflow-runs#get-a-workflow-run
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${input.run_id}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workflow run not found',
                run_id: input.run_id
            });
        }

        const providerRun = OutputSchema.parse(response.data);

        return providerRun;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
