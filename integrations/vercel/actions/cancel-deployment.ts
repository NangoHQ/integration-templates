import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Deployment ID to cancel. Example: "dpl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        url: z.string().optional(),
        name: z.string().optional(),
        readyState: z.string().optional(),
        type: z.string().optional(),
        createdAt: z.number().optional(),
        buildingAt: z.number().optional(),
        ready: z.number().optional(),
        target: z.string().nullable().optional(),
        projectId: z.string().optional(),
        ownerId: z.string().optional(),
        plan: z.string().optional(),
        public: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Cancel a deployment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://vercel.com/docs/rest-api/reference/endpoints/deployments#cancel-a-deployment
            endpoint: `/v12/deployments/${encodeURIComponent(input.id)}/cancel`,
            data: {},
            retries: 10
        });

        const deployment = OutputSchema.parse(response.data);
        return deployment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
