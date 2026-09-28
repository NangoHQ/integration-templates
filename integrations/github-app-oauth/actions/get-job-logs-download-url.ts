import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository. The name is not case sensitive.'),
        job_id: z.number().describe('The unique identifier of the job.')
    })
    .describe('Input parameters for retrieving the workflow job log content.');

const OutputSchema = z
    .object({
        content: z.string().describe('The plain text log content for the workflow job.'),
        content_type: z.string().optional().describe('The MIME type of the log content.'),
        content_length: z.number().optional().describe('The length of the log content in bytes.')
    })
    .describe('The workflow job log content and metadata.');

/**
 * @tags: [read]
 * @tagReason: Reads the workflow job log content from GitHub Actions.
 * @pitfalls: The action returns raw plain-text log content rather than a download URL because GitHub redirects to the actual log file.
 */
const action = createAction({
    description: 'Get the redirect URL for a workflow job log download.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/actions/workflow-jobs#get-job-logs-download-url
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/jobs/${encodeURIComponent(String(input.job_id))}/logs`,
            retries: 3
        });

        const contentType = typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : undefined;
        const contentLength = typeof response.headers['content-length'] === 'string' ? parseInt(response.headers['content-length'], 10) : undefined;

        return {
            content: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
            content_type: contentType,
            content_length: Number.isNaN(contentLength) ? undefined : contentLength
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
