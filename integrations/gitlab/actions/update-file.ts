import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.union([z.number(), z.string()]).describe('Project ID or URL-encoded path. Example: 82599306'),
    file_path: z.string().describe('URL-encoded full path to the file. Example: hello.txt'),
    branch: z.string().describe('Name of the branch to update the file in. Example: feature/test'),
    content: z.string().describe('The file content.'),
    commit_message: z.string().describe('Commit message.'),
    author_email: z.string().optional().describe("Commit author's email address."),
    author_name: z.string().optional().describe("Commit author's name."),
    encoding: z.enum(['text', 'base64']).optional().describe("Change encoding to 'base64'. Default is 'text'."),
    execute_filemode: z.boolean().optional().describe('If true, enables the execute flag on the file. If false, disables it.'),
    last_commit_id: z.string().optional().describe('Last known file commit ID.'),
    start_branch: z.string().optional().describe('Name of the base branch to create the branch from.')
});

const ProviderResponseSchema = z.object({
    file_path: z.string(),
    branch: z.string()
});

const OutputSchema = z.object({
    file_path: z.string(),
    branch: z.string()
});

const action = createAction({
    description: 'Update a GitLab repository file.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-file',
        group: 'Repository Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://docs.gitlab.com/api/repository_files/#update-existing-file-in-repository
            endpoint: `/api/v4/projects/${String(input.project_id)}/repository/files/${input.file_path}`,
            data: {
                branch: input.branch,
                content: input.content,
                commit_message: input.commit_message,
                ...(input.author_email !== undefined && { author_email: input.author_email }),
                ...(input.author_name !== undefined && { author_name: input.author_name }),
                ...(input.encoding !== undefined && { encoding: input.encoding }),
                ...(input.execute_filemode !== undefined && { execute_filemode: input.execute_filemode }),
                ...(input.last_commit_id !== undefined && { last_commit_id: input.last_commit_id }),
                ...(input.start_branch !== undefined && { start_branch: input.start_branch })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            file_path: providerResponse.file_path,
            branch: providerResponse.branch
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
