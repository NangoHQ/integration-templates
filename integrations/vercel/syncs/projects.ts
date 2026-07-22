import { createSync, type ProxyConfiguration } from 'nango';
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
                readyState: z.string().optional()
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

// `pagination` and `pagination.next` are required (next is nullable, not optional): Vercel
// signals "no more pages" via `next: null`, not by omitting the field or the whole object.
// If a response is missing pagination info entirely, parsing must fail loudly instead of
// silently being treated as the last page, which would close out trackDeletesEnd() based on
// an incomplete crawl.
const ProjectsListResponseSchema = z.object({
    projects: z.array(VercelProjectSchema),
    pagination: z.object({
        next: z.number().nullable()
    })
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

        const proxyConfig: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#get-project-list
            endpoint: '/v9/projects',
            params: {
                limit: 100,
                ...(until !== undefined && { until })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'until',
                cursor_path_in_response: 'pagination.next',
                response_path: 'projects',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    // Validate the full raw response (not just the extracted `projects` page)
                    // so a malformed/truncated response missing `pagination` throws instead
                    // of silently being treated as "no more pages".
                    const parsedPage = ProjectsListResponseSchema.safeParse(response.data);
                    if (!parsedPage.success) {
                        throw new Error(`Failed to parse projects response: ${parsedPage.error.message}`);
                    }
                    until = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(VercelProjectSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse projects response: ${parsed.error.message}`);
            }

            if (parsed.data.length > 0) {
                await nango.batchSave(parsed.data, 'VercelProject');
            }

            if (until !== undefined) {
                await nango.saveCheckpoint({ until });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('VercelProject');
    }
});
