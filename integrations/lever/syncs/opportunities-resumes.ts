import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OpportunityResumeSchema = z.object({
    id: z.string(),
    opportunityId: z.string(),
    createdAt: z.number().optional(),
    fileName: z.string().optional(),
    fileExt: z.string().optional(),
    fileStatus: z.string().optional()
});

const LeverResumeSchema = z.object({
    id: z.string(),
    createdAt: z.number().optional(),
    file: z
        .object({
            name: z.string().optional(),
            ext: z.string().optional(),
            status: z.string().optional()
        })
        .nullish()
});

const LeverResumeListResponseSchema = z.object({
    data: z.array(LeverResumeSchema.passthrough()).optional()
});

const OpportunityItemSchema = z.object({
    id: z.string()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all resumes for every single opportunity',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        OpportunityResume: OpportunityResumeSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = checkpoint?.['offset'] ?? '';

        const params: Record<string, string | number> = {
            limit: 100
        };
        if (offset) {
            params['offset'] = offset;
        }

        const opportunitiesProxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/opportunities',
            params,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const opportunities of nango.paginate(opportunitiesProxyConfig)) {
            const resumes: Array<z.infer<typeof OpportunityResumeSchema>> = [];

            for (const opportunity of opportunities) {
                const parsedOpportunity = OpportunityItemSchema.safeParse(opportunity);
                if (!parsedOpportunity.success) {
                    continue;
                }

                const opportunityId = parsedOpportunity.data.id;

                const resumesProxyConfig: ProxyConfiguration = {
                    // https://hire.lever.co/developer/documentation
                    endpoint: `/v1/opportunities/${encodeURIComponent(opportunityId)}/resumes`,
                    retries: 3
                };
                const resumesResponse = await nango.get(resumesProxyConfig);

                const parsed = LeverResumeListResponseSchema.safeParse(resumesResponse.data);
                if (!parsed.success) {
                    continue;
                }

                for (const resume of parsed.data.data ?? []) {
                    const file = resume.file;
                    const record: z.infer<typeof OpportunityResumeSchema> = {
                        id: resume.id,
                        opportunityId: opportunityId
                    };
                    if (typeof resume.createdAt === 'number') {
                        record.createdAt = resume.createdAt;
                    }
                    if (file?.name) {
                        record.fileName = file.name;
                    }
                    if (file?.ext) {
                        record.fileExt = file.ext;
                    }
                    if (file?.status) {
                        record.fileStatus = file.status;
                    }
                    resumes.push(record);
                }
            }

            if (resumes.length > 0) {
                await nango.batchSave(resumes, 'OpportunityResume');
            }

            if (offset) {
                await nango.saveCheckpoint({ offset });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
