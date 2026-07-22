import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    idOrUrl: z
        .string()
        .describe('The unique identifier or hostname of the deployment. Example: "dpl_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" or "my-deployment.vercel.app"'),
    teamId: z.string().optional().describe('The Team identifier to perform the request on behalf of.'),
    slug: z.string().optional().describe('The Team slug to perform the request on behalf of.')
});

const CreatorSchema = z.object({
    uid: z.string(),
    username: z.string().optional(),
    avatar: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    framework: z.string().nullable().optional()
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the deployment'),
        url: z.string().describe('The unique URL of the deployment'),
        name: z.string().describe('The name of the project associated with the deployment'),
        readyState: z.string().describe('The state of the deployment'),
        status: z.string().describe('The status of the deployment'),
        createdAt: z.number().describe('The date when the deployment was created in milliseconds'),
        creator: CreatorSchema,
        project: ProjectSchema.optional(),
        projectId: z.string().optional(),
        team: TeamSchema.optional(),
        target: z.string().nullable().optional().describe('Either "production", "staging", or null for preview'),
        type: z.string().optional(),
        version: z.number().optional(),
        public: z.boolean().optional(),
        aliasAssigned: z.boolean().optional(),
        alias: z.array(z.string()).optional(),
        automaticAliases: z.array(z.string()).optional(),
        regions: z.array(z.string()).optional(),
        buildingAt: z.number().optional(),
        bootedAt: z.number().optional(),
        ready: z.number().optional(),
        buildSkipped: z.boolean().optional(),
        meta: z.record(z.string(), z.string()).optional(),
        env: z.array(z.string()).optional(),
        inspectorUrl: z.string().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a deployment',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://vercel.com/docs/rest-api/deployments/get-a-deployment-by-id-or-url
        const response = await nango.get({
            endpoint: `/v13/deployments/${encodeURIComponent(input.idOrUrl)}`,
            params: {
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.slug !== undefined && { slug: input.slug })
            },
            retries: 3
        });

        const deployment = OutputSchema.parse(response.data);

        return deployment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
