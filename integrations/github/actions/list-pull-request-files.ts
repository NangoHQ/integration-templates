import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "Hello-World"'),
    pull_number: z.number().int().describe('The number that identifies the pull request. Example: 1'),
    per_page: z.number().int().optional().describe('The number of results per page (max 100). Default: 30'),
    page: z.number().int().optional().describe('The page number of the results to fetch. Default: 1')
});

const ProviderDiffEntrySchema = z.object({
    sha: z.string().nullable(),
    filename: z.string(),
    status: z.enum(['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged']),
    additions: z.number().int(),
    deletions: z.number().int(),
    changes: z.number().int(),
    blob_url: z.string(),
    raw_url: z.string(),
    contents_url: z.string(),
    patch: z.string().optional(),
    previous_filename: z.string().optional()
});

const DiffEntrySchema = z.object({
    sha: z.string().nullable().optional(),
    filename: z.string(),
    status: z.enum(['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged']),
    additions: z.number().int(),
    deletions: z.number().int(),
    changes: z.number().int(),
    blob_url: z.string(),
    raw_url: z.string(),
    contents_url: z.string(),
    patch: z.string().optional(),
    previous_filename: z.string().optional()
});

const OutputSchema = z.object({
    files: z.array(DiffEntrySchema)
});

const action = createAction({
    description: 'List files changed by a pull request',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.page !== undefined) {
            params['page'] = input.page;
        }

        const response = await nango.get({
            // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests-files
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/files`,
            params: params,
            retries: 3
        });

        const providerFiles = z.array(ProviderDiffEntrySchema).parse(response.data);

        const files = providerFiles.map((file) => ({
            ...(file.sha != null && { sha: file.sha }),
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            blob_url: file.blob_url,
            raw_url: file.raw_url,
            contents_url: file.contents_url,
            ...(file.patch !== undefined && { patch: file.patch }),
            ...(file.previous_filename !== undefined && { previous_filename: file.previous_filename })
        }));

        return {
            files
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
