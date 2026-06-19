import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const EnvironmentSchema = z.object({
    type: z.string().optional(),
    uuid: z.string().optional(),
    name: z.string().optional()
});

const PaginatedResponseSchema = z.object({
    values: z.array(z.unknown()).optional(),
    next: z.string().optional(),
    page: z.number().optional(),
    size: z.number().optional(),
    pagelen: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(EnvironmentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List deployment environments for a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pipeline'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.cursor) {
            if (input.cursor.startsWith('http')) {
                const cursorUrl = new URL(input.cursor);
                for (const [key, value] of cursorUrl.searchParams) {
                    params[key] = value;
                }
            } else {
                params['page'] = input.cursor;
            }
        }

        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-deployments/#api-repositories-workspace-repo-slug-environments-get
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/environments`,
            params,
            retries: 3
        });

        const paginatedData = PaginatedResponseSchema.parse(response.data);

        const items = (paginatedData.values ?? []).map((item) => {
            return EnvironmentSchema.parse(item);
        });

        return {
            items,
            ...(paginatedData.next !== undefined && { next_cursor: paginatedData.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
