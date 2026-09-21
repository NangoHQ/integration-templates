import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "viictoo"'),
    repo: z.string().describe('The name of the repository without the .git extension. Example: "api-playground2"'),
    tree_sha: z.string().describe('The SHA1 value or ref (branch or tag) name of the tree. Example: "main"'),
    recursive: z.boolean().optional().describe('Setting to true returns the objects or subtrees referenced by the tree. Omit for the top-level tree only.')
});

const TreeEntrySchema = z.object({
    path: z.string(),
    mode: z.string(),
    type: z.enum(['blob', 'tree', 'commit']),
    sha: z.string(),
    size: z.number().optional(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    sha: z.string(),
    url: z.string().optional(),
    tree: z.array(TreeEntrySchema),
    truncated: z.boolean()
});

const action = createAction({
    description: 'Get a git tree for a repository, optionally recursively, listing the files and directories it contains.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/git/trees#get-a-tree
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/trees/${encodeURIComponent(input.tree_sha)}`,
            params: {
                ...(input.recursive && { recursive: '1' })
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Tree not found',
                owner: input.owner,
                repo: input.repo,
                tree_sha: input.tree_sha
            });
        }

        const tree = OutputSchema.parse(response.data);

        return tree;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
