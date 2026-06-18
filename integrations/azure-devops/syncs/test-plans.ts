import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    projects: z.array(z.string().min(1))
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const TeamProjectReferenceSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const IdentityRefSchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional()
});

const TestSuiteReferenceSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const TestPlanResponseSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    project: TeamProjectReferenceSchema.optional(),
    areaPath: z.string().optional(),
    iteration: z.string().optional(),
    owner: IdentityRefSchema.nullable().optional(),
    state: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    updatedDate: z.string().optional(),
    updatedBy: IdentityRefSchema.nullable().optional(),
    rootSuite: TestSuiteReferenceSchema.optional(),
    revision: z.number().optional(),
    description: z.string().optional(),
    buildId: z.number().optional()
});

const TestPlanListResponseSchema = z.object({
    value: z.array(TestPlanResponseSchema),
    count: z.number().optional()
});

const TestPlanSchema = z.object({
    id: z.string().describe('The unique identifier of the test plan'),
    name: z.string().describe('The name of the test plan'),
    projectId: z.string().describe('The identifier of the project containing the test plan'),
    projectName: z.string().describe('The name of the project containing the test plan'),
    areaPath: z.string().optional(),
    iteration: z.string().optional(),
    state: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    updatedDate: z.string().optional(),
    ownerId: z.string().optional(),
    ownerDisplayName: z.string().optional(),
    rootSuiteId: z.number().optional(),
    rootSuiteName: z.string().optional(),
    revision: z.number().optional(),
    description: z.string().optional(),
    buildId: z.number().optional()
});

const sync = createSync({
    description: 'Sync test plans across projects',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/test-plans' }],
    models: {
        TestPlan: TestPlanSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Metadata must contain a non-empty array of project names');
        }

        const projects = parsedMetadata.data.projects;
        if (projects.length === 0) {
            throw new Error('Metadata must contain at least one project');
        }

        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint ?? { cursor: '' });
        if (!parsedCheckpoint.success) {
            throw new Error('Invalid checkpoint: ' + parsedCheckpoint.error.message);
        }

        // Full-refresh delete-tracked sync: unconditionally reset cursor to undefined
        let continuationToken: string | undefined;

        await nango.trackDeletesStart('TestPlan');

        for (const project of projects) {
            do {
                const response = await nango.get({
                    // https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/test-plans/list?view=azure-devops-rest-7.2
                    endpoint: '/' + encodeURIComponent(project) + '/_apis/testplan/plans',
                    params: {
                        'api-version': '7.2-preview.1',
                        ...(continuationToken && { continuationToken })
                    },
                    retries: 3
                });

                const parsed = TestPlanListResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error('Failed to parse test plans for project ' + project + ': ' + parsed.error.message);
                }

                const testPlans = parsed.data.value.map((plan) => {
                    const projectId = plan.project?.id ?? '';
                    const projectName = plan.project?.name ?? '';
                    const ownerId = plan.owner?.id ?? undefined;
                    const ownerDisplayName = plan.owner?.displayName ?? undefined;

                    return {
                        id: String(plan.id),
                        name: plan.name ?? '',
                        projectId,
                        projectName,
                        areaPath: plan.areaPath,
                        iteration: plan.iteration,
                        state: plan.state,
                        startDate: plan.startDate,
                        endDate: plan.endDate,
                        updatedDate: plan.updatedDate,
                        ownerId,
                        ownerDisplayName,
                        rootSuiteId: plan.rootSuite?.id,
                        rootSuiteName: plan.rootSuite?.name,
                        revision: plan.revision,
                        description: plan.description,
                        buildId: plan.buildId
                    };
                });

                if (testPlans.length > 0) {
                    await nango.batchSave(testPlans, 'TestPlan');
                }

                continuationToken = response.headers['x-ms-continuationtoken']?.trim();
                if (!continuationToken) {
                    continuationToken = undefined;
                } else {
                    await nango.saveCheckpoint({ cursor: continuationToken });
                }
            } while (continuationToken);
        }

        await nango.trackDeletesEnd('TestPlan');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
