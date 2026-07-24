import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deploymentId: z.string().describe('Deployment ID to delete. Example: "dpl_xxx"')
});

const ProviderResponseSchema = z.object({
    uid: z.string(),
    state: z.string()
});

const OutputSchema = z.object({
    uid: z.string(),
    state: z.string()
});

const action = createAction({
    description: 'Permanently delete a deployment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects', 'deployments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://vercel.com/docs/rest-api/reference/deployments#delete-a-deployment
        const response = await nango.delete({
            endpoint: `/v13/deployments/${encodeURIComponent(input.deploymentId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Deployment not found or could not be deleted.',
                deployment_id: input.deploymentId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            uid: providerResponse.uid,
            state: providerResponse.state
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
