import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    businessId: z.union([z.string(), z.number()])
});

const InputSchema = z.object({
    projectId: z.string().describe('The project ID to delete. Example: "123"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    projectId: z.string()
});

const action = createAction({
    description: 'Delete a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:projects:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'businessId is required in connection metadata.'
            });
        }

        const businessId = parsedMetadata.data.businessId;

        // https://www.freshbooks.com/api/projects
        const response = await nango.delete({
            endpoint: `/projects/business/${encodeURIComponent(String(businessId))}/projects/${encodeURIComponent(input.projectId)}`,
            retries: 10
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete project. Received status ${response.status}.`
            });
        }

        return {
            success: true,
            projectId: input.projectId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
