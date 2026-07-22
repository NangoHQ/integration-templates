import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deploymentId: z.string().describe('The deployment ID to assign the alias to. Example: "dpl_123"'),
    alias: z.string().describe('The alias to assign. A bare subdomain is normalized to ".vercel.app" automatically. Example: "foo" or "foo.vercel.app"')
});

const ProviderOutputSchema = z.object({
    uid: z.string(),
    alias: z.string(),
    created: z.string(),
    oldDeploymentId: z.string().nullable().optional()
});

const OutputSchema = z.object({
    uid: z.string().describe('The unique identifier of the alias'),
    alias: z.string().describe('The assigned alias name'),
    created: z.string().describe('The date when the alias was created'),
    oldDeploymentId: z.string().optional().describe('The unique identifier of the previously aliased deployment, only received when the alias was used before')
});

const action = createAction({
    description: 'Assign an alias to a deployment',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://vercel.com/docs/rest-api/aliases/assign-an-alias
            endpoint: `/v2/deployments/${encodeURIComponent(input.deploymentId)}/aliases`,
            data: {
                alias: input.alias
            },
            retries: 1
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            uid: providerOutput.uid,
            alias: providerOutput.alias,
            created: providerOutput.created,
            ...(providerOutput.oldDeploymentId != null && { oldDeploymentId: providerOutput.oldDeploymentId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
