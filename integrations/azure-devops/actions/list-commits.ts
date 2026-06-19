import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "nangoapi"'),
    repositoryId: z.string().describe('Repository ID or name. Example: "my-repo"'),
    branch: z.string().optional().describe('Branch name to filter commits. Example: "main"'),
    fromDate: z.string().optional().describe('Filter commits created after this date (ISO 8601). Example: "2024-01-01T00:00:00Z"'),
    top: z.number().optional().describe('Number of commits to return per page. Example: 100'),
    skip: z.number().optional().describe('Number of commits to skip. Example: 0'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (continuationToken). Omit for the first page.')
});

const CommitSchema = z
    .object({
        commitId: z.string(),
        author: z
            .object({
                name: z.string().optional(),
                email: z.string().optional(),
                date: z.string().optional()
            })
            .optional(),
        committer: z
            .object({
                name: z.string().optional(),
                email: z.string().optional(),
                date: z.string().optional()
            })
            .optional(),
        comment: z.string().optional(),
        changeCounts: z
            .object({
                Add: z.number().optional(),
                Edit: z.number().optional(),
                Delete: z.number().optional()
            })
            .optional(),
        url: z.string().optional(),
        remoteUrl: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CommitSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List commits in a Git repository with optional date/branch filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            'api-version': '7.2-preview.1'
        };

        if (input.branch !== undefined) {
            params['searchCriteria.itemVersion.version'] = input.branch;
            params['searchCriteria.itemVersion.versionType'] = 'Branch';
        }

        if (input.fromDate !== undefined) {
            params['searchCriteria.fromDate'] = input.fromDate;
        }

        if (input.top !== undefined) {
            params['searchCriteria.$top'] = input.top;
        }

        if (input.skip !== undefined) {
            params['searchCriteria.$skip'] = input.skip;
        }

        if (input.cursor !== undefined) {
            params['continuationToken'] = input.cursor;
        }

        // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/commits/get-commits?view=azure-devops-rest-7.2
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.project)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}/commits`,
            params,
            retries: 3
        });

        const rawData = response.data;
        if (rawData === null || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Azure DevOps API'
            });
        }

        const entries = Object.entries(rawData);
        const valueEntry = entries.find(([key]) => key === 'value');
        if (!valueEntry) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Azure DevOps API: missing value array'
            });
        }

        const value = valueEntry[1];
        if (!Array.isArray(value)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Azure DevOps API: value is not an array'
            });
        }

        const commits: z.infer<typeof CommitSchema>[] = [];
        for (const item of value) {
            const parsed = CommitSchema.safeParse(item);
            if (parsed.success) {
                commits.push(parsed.data);
            }
        }

        let nextCursor: string | undefined;
        const headers = response.headers;
        if (headers !== null && typeof headers === 'object') {
            for (const [key, val] of Object.entries(headers)) {
                if (key.toLowerCase() === 'x-ms-continuationtoken' && typeof val === 'string') {
                    nextCursor = val;
                    break;
                }
            }
        }

        return {
            items: commits,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
