import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    deploymentId: z.string().describe('The unique deployment identifier. Example: "dpl_5pxFLgZoAcW5c8bSJUwD4Qr518tN"')
});

type FileTreeNode = {
    name: string;
    type: 'directory' | 'file' | 'invalid' | 'lambda' | 'middleware' | 'symlink';
    mode: number;
    uid?: string | undefined;
    contentType?: string | undefined;
    children?: FileTreeNode[] | undefined;
};

const FileTreeNodeSchema: z.ZodType<FileTreeNode> = z.lazy(() =>
    z.object({
        name: z.string(),
        type: z.enum(['directory', 'file', 'invalid', 'lambda', 'middleware', 'symlink']),
        mode: z.number(),
        uid: z.string().optional(),
        contentType: z.string().optional(),
        children: z.array(FileTreeNodeSchema).optional()
    })
);

const OutputSchema = z.object({
    files: z.array(FileTreeNodeSchema)
});

const action = createAction({
    description: 'List the file tree of a deployment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/deployments/list-deployment-files
            endpoint: `/v6/deployments/${encodeURIComponent(input.deploymentId)}/files`,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = z.array(FileTreeNodeSchema).parse(response.data);

        return {
            files: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
