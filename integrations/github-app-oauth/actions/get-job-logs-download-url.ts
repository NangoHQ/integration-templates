import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository. The name is not case sensitive.'),
        job_id: z.number().describe('The unique identifier of the job.')
    })
    .describe('Input parameters for retrieving the workflow job log download URL.');

const OutputSchema = z
    .object({
        download_url: z
            .string()
            .describe(
                'The API endpoint URL for the job logs. Note: due to Nango proxy limitations with 302 redirects, this is the API endpoint rather than the actual pre-signed download URL. Make a direct, authenticated request to this URL to receive the 302 redirect and extract the Location header for the actual log content.'
            )
    })
    .describe('The workflow job log download endpoint.');

/**
 * @tags: [read]
 * @tagReason: Returns the GitHub API endpoint used to retrieve workflow job logs; no request is made and no repository data is read.
 * @pitfalls: This endpoint responds with an HTTP 302 redirect to a time-limited, pre-signed blob storage URL containing the actual log content. The Nango proxy follows redirects automatically while still attaching the original GitHub Authorization header, which the pre-signed storage URL rejects (it authenticates via its own query-string signature). Calling it through the proxy therefore fails or returns the wrong content instead of the log data. This action returns the API endpoint URL itself so callers can make a direct request with their own GitHub token and read the Location header from the 302 response.
 */
const action = createAction({
    description:
        'Get the API endpoint URL for a workflow job log download. Due to Nango proxy limitations with 302 redirects, this returns the API endpoint rather than the actual download URL.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],
    exec: async (_nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/actions/workflow-jobs#get-job-logs-download-url
        //
        // This endpoint returns a 302 redirect with the Location header containing the
        // actual download URL. However, the Nango proxy follows redirects automatically
        // and passes the Authorization header to the redirect URL, which causes the blob
        // storage provider to reject the request.
        //
        // Due to this limitation, this action returns the API endpoint URL instead of
        // making the request. Callers should make a direct request to this URL with their
        // GitHub token to receive the 302 redirect and extract the Location header
        // containing the actual download URL.
        const apiUrl = `https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/jobs/${input.job_id}/logs`;

        return {
            download_url: apiUrl
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
