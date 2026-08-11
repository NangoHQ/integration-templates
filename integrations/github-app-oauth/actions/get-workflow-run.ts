import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository.'),
        repo: z.string().describe('The name of the repository without the .git extension.'),
        run_id: z.number().describe('The unique identifier of the workflow run. Example: 31489919982'),
        exclude_pull_requests: z.boolean().optional().describe('If true, pull requests are omitted from the response.')
    })
    .describe('Input for retrieving a single workflow run.');

const ActorSchema = z.object({
    login: z.string().optional().describe('The login username of the actor.'),
    id: z.number().optional().describe('The unique identifier of the actor.'),
    avatar_url: z.string().optional().describe('The avatar URL of the actor.'),
    html_url: z.string().optional().describe('The HTML URL of the actor profile.'),
    type: z.string().optional().describe('The type of the actor (e.g., User, Bot).')
});

const PullRequestSchema = z.object({
    id: z.number().optional().describe('The unique identifier of the pull request.'),
    number: z.number().optional().describe('The pull request number.'),
    url: z.string().optional().describe('The REST API URL for the pull request.'),
    head: z
        .object({
            ref: z.string().optional().describe('The head branch reference.'),
            sha: z.string().optional().describe('The head commit SHA.'),
            repo: z
                .object({
                    id: z.number().optional().describe('The repository ID.'),
                    url: z.string().optional().describe('The REST API URL for the repository.'),
                    name: z.string().optional().describe('The repository name.')
                })
                .optional()
                .describe('The head repository.')
        })
        .optional()
        .describe('The head branch information.'),
    base: z
        .object({
            ref: z.string().optional().describe('The base branch reference.'),
            sha: z.string().optional().describe('The base commit SHA.'),
            repo: z
                .object({
                    id: z.number().optional().describe('The repository ID.'),
                    url: z.string().optional().describe('The REST API URL for the repository.'),
                    name: z.string().optional().describe('The repository name.')
                })
                .optional()
                .describe('The base repository.')
        })
        .optional()
        .describe('The base branch information.')
});

const HeadCommitSchema = z.object({
    id: z.string().optional().describe('The commit SHA.'),
    tree_id: z.string().optional().describe('The tree SHA of the commit.'),
    message: z.string().optional().describe('The commit message.'),
    timestamp: z.string().optional().describe('The commit timestamp.'),
    author: z
        .object({
            name: z.string().optional().describe('The name of the commit author.'),
            email: z.string().optional().describe('The email of the commit author.')
        })
        .optional()
        .describe('The author of the commit.'),
    committer: z
        .object({
            name: z.string().optional().describe('The name of the commit committer.'),
            email: z.string().optional().describe('The email of the commit committer.')
        })
        .optional()
        .describe('The committer of the commit.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the workflow run.'),
        name: z.string().optional().describe('The name of the workflow run.'),
        head_branch: z.string().optional().describe('The head branch of the workflow run.'),
        head_sha: z.string().describe('The SHA of the commit that triggered the workflow run.'),
        path: z.string().describe('The path to the workflow file.'),
        run_number: z.number().describe('The run number of the workflow run.'),
        run_attempt: z.number().optional().describe('The attempt number of the workflow run.'),
        event: z.string().describe('The event that triggered the workflow run.'),
        status: z.string().optional().describe('The status of the workflow run.'),
        conclusion: z.string().optional().describe('The conclusion of the workflow run.'),
        workflow_id: z.number().describe('The ID of the workflow.'),
        url: z.string().describe('The REST API URL for the workflow run.'),
        html_url: z.string().describe('The HTML URL for the workflow run.'),
        pull_requests: z.array(PullRequestSchema).optional().describe('The pull requests associated with the workflow run.'),
        created_at: z.string().describe('The creation timestamp of the workflow run.'),
        updated_at: z.string().describe('The last update timestamp of the workflow run.'),
        run_started_at: z.string().optional().describe('The start timestamp of the workflow run.'),
        actor: ActorSchema.optional().describe('The user who triggered the workflow run.'),
        triggering_actor: ActorSchema.optional().describe('The user who triggered the workflow run.'),
        jobs_url: z.string().describe('The REST API URL for the jobs in the workflow run.'),
        logs_url: z.string().describe('The REST API URL for the logs of the workflow run.'),
        check_suite_url: z.string().describe('The REST API URL for the check suite of the workflow run.'),
        artifacts_url: z.string().describe('The REST API URL for the artifacts of the workflow run.'),
        cancel_url: z.string().describe('The REST API URL to cancel the workflow run.'),
        rerun_url: z.string().describe('The REST API URL to rerun the workflow run.'),
        previous_attempt_url: z.string().optional().describe('The REST API URL for the previous attempt of the workflow run.'),
        workflow_url: z.string().describe('The REST API URL for the workflow.'),
        head_commit: HeadCommitSchema.optional().describe('The head commit of the workflow run.'),
        display_title: z.string().describe('The display title of the workflow run.')
    })
    .describe('Details and status of a single workflow run.');

/**
 * @tags: [read]
 * @tagReason: Retrieves details and status of a single workflow run from the GitHub API.
 * @pitfalls: conclusion is null while status is not "completed", and trivial workflows can transition from queued to completed within seconds.
 */
const action = createAction({
    description: 'Get details and status of a single workflow run.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#get-a-workflow-run
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${encodeURIComponent(String(input.run_id))}`,
            params: {
                ...(input.exclude_pull_requests !== undefined && { exclude_pull_requests: String(input.exclude_pull_requests) })
            },
            retries: 3
        });

        const run = OutputSchema.parse(response.data);
        return run;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
