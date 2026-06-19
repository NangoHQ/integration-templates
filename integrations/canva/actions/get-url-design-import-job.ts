import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    jobId: z.string().describe('The ID of the URL import job. Example: "e08861ae-3b29-45db-8dc1-1fe0bf7f1cc8"')
});

const ThumbnailSchema = z.object({
    width: z.number().int(),
    height: z.number().int(),
    url: z.string()
});

const DesignLinksSchema = z.object({
    edit_url: z.string(),
    view_url: z.string()
});

const DesignSummarySchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    thumbnail: ThumbnailSchema.optional(),
    urls: DesignLinksSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
    page_count: z.number().int().optional()
});

const DesignImportErrorSchema = z.object({
    code: z.string(),
    message: z.string()
});

const DesignImportJobResultSchema = z.object({
    designs: z.array(DesignSummarySchema)
});

const DesignImportJobSchema = z.object({
    id: z.string(),
    status: z.enum(['failed', 'in_progress', 'success']),
    result: DesignImportJobResultSchema.optional(),
    error: DesignImportErrorSchema.optional()
});

const ProviderResponseSchema = z.object({
    job: DesignImportJobSchema
});

const OutputSchema = z.object({
    job: z.object({
        id: z.string(),
        status: z.enum(['failed', 'in_progress', 'success']),
        result: z
            .object({
                designs: z.array(
                    z.object({
                        id: z.string(),
                        title: z.string().optional(),
                        url: z.string().optional(),
                        thumbnail: z
                            .object({
                                width: z.number().int(),
                                height: z.number().int(),
                                url: z.string()
                            })
                            .optional(),
                        urls: z.object({
                            edit_url: z.string(),
                            view_url: z.string()
                        }),
                        created_at: z.number().int(),
                        updated_at: z.number().int(),
                        page_count: z.number().int().optional()
                    })
                )
            })
            .optional(),
        error: z
            .object({
                code: z.string(),
                message: z.string()
            })
            .optional()
    })
});

const action = createAction({
    description: 'Retrieve URL design import job status/result.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['portability:import'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/design-imports/get-url-import-job/
            endpoint: `/rest/v1/url-imports/${encodeURIComponent(input.jobId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider response did not match the expected schema.',
                details: parsed.error.issues
            });
        }

        const job = parsed.data.job;

        return {
            job: {
                id: job.id,
                status: job.status,
                ...(job.result !== undefined && {
                    result: {
                        designs: job.result.designs.map((design) => ({
                            id: design.id,
                            ...(design.title !== undefined && { title: design.title }),
                            ...(design.url !== undefined && { url: design.url }),
                            ...(design.thumbnail !== undefined && {
                                thumbnail: {
                                    width: design.thumbnail.width,
                                    height: design.thumbnail.height,
                                    url: design.thumbnail.url
                                }
                            }),
                            urls: {
                                edit_url: design.urls.edit_url,
                                view_url: design.urls.view_url
                            },
                            created_at: design.created_at,
                            updated_at: design.updated_at,
                            ...(design.page_count !== undefined && {
                                page_count: design.page_count
                            })
                        }))
                    }
                }),
                ...(job.error !== undefined && {
                    error: {
                        code: job.error.code,
                        message: job.error.message
                    }
                })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
