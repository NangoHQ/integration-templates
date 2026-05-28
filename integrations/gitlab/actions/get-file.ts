import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.union([z.number(), z.string()]).describe('Project ID or URL-encoded path. Example: 82599306'),
    file_path: z.string().describe('URL-encoded full path to the file. Example: hello.txt'),
    ref: z.string().optional().describe('Name of branch, tag, or commit. Defaults to the default branch if omitted.')
});

const ProviderFileSchema = z.object({
    file_name: z.string(),
    file_path: z.string(),
    size: z.number(),
    encoding: z.string(),
    content: z.string(),
    content_sha256: z.string(),
    ref: z.string(),
    blob_id: z.string(),
    commit_id: z.string(),
    last_commit_id: z.string(),
    execute_filemode: z.boolean()
});

const OutputSchema = z.object({
    file_name: z.string(),
    file_path: z.string(),
    size: z.number(),
    encoding: z.string(),
    content: z.string(),
    content_sha256: z.string(),
    ref: z.string(),
    blob_id: z.string(),
    commit_id: z.string(),
    last_commit_id: z.string(),
    execute_filemode: z.boolean()
});

const action = createAction({
    description: 'Fetch a GitLab repository file.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-file',
        group: 'Repository Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api', 'read_repository'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.gitlab.com/api/repository_files/#retrieve-a-file-from-a-repository
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/repository/files/${encodeURIComponent(input.file_path)}`,
            params: {
                ...(input.ref !== undefined && { ref: input.ref })
            },
            retries: 3
        });

        const providerFile = ProviderFileSchema.parse(response.data);

        return {
            file_name: providerFile.file_name,
            file_path: providerFile.file_path,
            size: providerFile.size,
            encoding: providerFile.encoding,
            content: providerFile.content,
            content_sha256: providerFile.content_sha256,
            ref: providerFile.ref,
            blob_id: providerFile.blob_id,
            commit_id: providerFile.commit_id,
            last_commit_id: providerFile.last_commit_id,
            execute_filemode: providerFile.execute_filemode
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
