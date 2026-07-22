import { createSync } from 'nango';
import { z } from 'zod';

const VercelProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountId: z.string(),
    createdAt: z.number(),
    updatedAt: z.number().optional(),
    framework: z.string().nullable().optional(),
    latestDeployments: z
        .array(
            z.object({
                id: z.string(),
                url: z.string().optional(),
                createdAt: z.number().optional(),
                state: z.string().optional()
            })
        )
        .optional(),
    link: z
        .object({
            type: z.string(),
            org: z.string().optional(),
            repo: z.string().optional(),
            repoId: z.number().optional(),
            gitCredentialId: z.string().optional(),
            createdAt: z.number().optional(),
            deployHooks: z
                .array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        ref: z.string(),
                        url: z.string(),
                        createdAt: z.number().optional()
                    })
                )
                .optional()
        })
        .nullable()
        .optional(),
    targets: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    until: z.number()
});

const ProjectsListResponseSchema = z.object({
    projects: z.array(VercelProjectSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
        })
        .optional()
});

export default createSync({
    description: 'Sync projects.',
    frequency: 'every hour',
    models: {
        VercelProject: VercelProjectSchema
    },
    checkpoint: CheckpointSchema,
    autoStart: true,

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let until = checkpoint?.until;

        // Blocker: /v9/projects only exposes creation-time cursor pagination. Use the
        // cursor for resume only; a full crawl is still required for delete tracking.
        await nango.trackDeletesStart('VercelProject');

        while (true) {
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#get-project-list
            const response = await nango.get({
                endpoint: '/v9/projects',
                params: {
                    limit: 100,
                    ...(until !== undefined && { until })
                },
                retries: 3
            });

            const parsed = ProjectsListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse projects response: ${parsed.error.message}`);
            }

            if (parsed.data.projects.length > 0) {
                await nango.batchSave(parsed.data.projects, 'VercelProject');
            }

            const nextUntil = parsed.data.pagination?.next ?? undefined;
            if (nextUntil === undefined) {
                break;
            }

            until = nextUntil;
            await nango.saveCheckpoint({ until });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('VercelProject');
    }
});
