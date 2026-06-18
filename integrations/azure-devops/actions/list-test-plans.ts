import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "nangoapi"'),
    cursor: z.string().optional().describe('Pagination cursor (continuationToken) from the previous response. Omit for the first page.')
});

const ProjectSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional()
});

const RootSuiteSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    url: z.string().optional()
});

const ProviderTestPlanSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    url: z.string().optional(),
    areaPath: z.string().optional(),
    iteration: z.string().optional(),
    state: z.string().optional(),
    project: ProjectSchema.optional(),
    rootSuite: RootSuiteSchema.optional(),
    clientUrl: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

const ProviderResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(ProviderTestPlanSchema).optional()
});

const OutputItemSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    url: z.string().optional(),
    areaPath: z.string().optional(),
    iteration: z.string().optional(),
    state: z.string().optional(),
    project: ProjectSchema.optional(),
    rootSuite: RootSuiteSchema.optional(),
    clientUrl: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page.')
});

const action = createAction({
    description: 'List test plans in a project.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-test-plans',
        group: 'Test Plans'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.test'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/plans/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/testplan/plans`,
            params: {
                'api-version': '7.2-preview.1',
                ...(input.cursor && { continuationToken: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse provider response',
                details: parsed.error.issues
            });
        }

        const plans = parsed.data.value || [];
        const nextCursor = response.headers['x-ms-continuationtoken'];

        return {
            items: plans.map((plan) => ({
                id: plan.id,
                ...(plan.name !== undefined && { name: plan.name }),
                ...(plan.url !== undefined && { url: plan.url }),
                ...(plan.areaPath !== undefined && { areaPath: plan.areaPath }),
                ...(plan.iteration !== undefined && { iteration: plan.iteration }),
                ...(plan.state !== undefined && { state: plan.state }),
                ...(plan.project !== undefined && { project: plan.project }),
                ...(plan.rootSuite !== undefined && { rootSuite: plan.rootSuite }),
                ...(plan.clientUrl !== undefined && { clientUrl: plan.clientUrl }),
                ...(plan.startDate !== undefined && { startDate: plan.startDate }),
                ...(plan.endDate !== undefined && { endDate: plan.endDate })
            })),
            ...(typeof nextCursor === 'string' && nextCursor.length > 0 && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
