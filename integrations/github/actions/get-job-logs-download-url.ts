import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "hello-world"'),
    job_id: z.number().describe('The unique identifier of the job. Example: 123456789')
});

const OutputSchema = z.object({
    download_url: z
        .string()
        .describe(
            'The API endpoint URL for job logs. Note: Due to Nango proxy limitations with 302 redirects, this returns the API endpoint rather than the actual download URL. Users should make a direct request to this URL with their GitHub token to receive the 302 redirect and extract the Location header.'
        )
});

const action = createAction({
    description:
        'Get the API endpoint URL for a workflow job log download. Due to Nango proxy limitations with 302 redirects, this returns the API endpoint rather than the actual download URL.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-job-logs-download-url',
        group: 'Actions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (_nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/actions/workflow-jobs?apiVersion=2022-11-28#download-job-logs-for-a-workflow-run
        //
        // This endpoint returns a 302 redirect with the Location header containing the
        // actual download URL. However, the Nango proxy follows redirects automatically
        // and passes the Authorization header to the redirect URL, which causes Azure blob
        // storage to reject the request with a 401 error.
        //
        // Due to this limitation, this action returns the API endpoint URL instead of
        // making the request. Users should make a direct request to this URL with their
        // GitHub token to receive the 302 redirect and extract the Location header
        // containing the actual download URL.

        // Construct the GitHub API endpoint URL for the logs
        const apiUrl = `https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/jobs/${input.job_id}/logs`;

        return {
            download_url: apiUrl
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
