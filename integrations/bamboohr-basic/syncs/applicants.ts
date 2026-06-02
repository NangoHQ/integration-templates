import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const JobTitleSchema = z.object({
    id: z.number().nullable().optional(),
    label: z.string().optional()
});

const JobSchema = z.object({
    id: z.number().optional(),
    title: JobTitleSchema.optional()
});

const StatusSchema = z.object({
    id: z.number().optional(),
    label: z.string().optional()
});

const ApplicantInfoSchema = z.object({
    id: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    avatar: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    source: z.string().nullable().optional()
});

const ApplicationItemSchema = z.object({
    id: z.number(),
    appliedDate: z.string().optional(),
    status: StatusSchema.optional(),
    rating: z.number().nullable().optional(),
    applicant: ApplicantInfoSchema.optional(),
    job: JobSchema.optional()
});

const EnvelopeSchema = z.object({
    paginationComplete: z.boolean().optional(),
    nextPageUrl: z.string().nullable().optional(),
    applications: z.array(z.unknown()).optional()
});

const ApplicantSchema = z.object({
    id: z.string(),
    appliedDate: z.string().optional(),
    statusId: z.number().optional(),
    statusLabel: z.string().optional(),
    rating: z.number().optional(),
    applicantId: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    avatar: z.string().optional(),
    email: z.string().optional(),
    source: z.string().optional(),
    jobId: z.number().optional(),
    jobTitleId: z.number().optional(),
    jobTitleLabel: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync applicants from the BambooHR ATS.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Applicant: ApplicantSchema
    },
    endpoints: [
        {
            path: '/syncs/applicants',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter: string = checkpoint?.['updated_after'] ?? '';
        let page: number | undefined = checkpoint?.['page'] ?? 1;
        let lastProcessedAppliedDate: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://documentation.bamboohr.com/reference/get-applications
            endpoint: '/v1/applicant_tracking/applications',
            params: {
                sortBy: 'last_updated',
                sortOrder: 'ASC',
                ...(updatedAfter ? { newSince: updatedAfter } : {})
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                response_path: 'applications',
                limit_name_in_request: 'per_page',
                limit: 2,
                on_page: async ({ nextPageParam, response }) => {
                    const parsed = EnvelopeSchema.safeParse(response.data);
                    if (!parsed.success) {
                        throw new Error('Invalid response envelope from BambooHR applications endpoint');
                    }
                    const envelope = parsed.data;
                    if (envelope.paginationComplete) {
                        page = undefined;
                    } else {
                        page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const applications of nango.paginate(proxyConfig)) {
            if (!Array.isArray(applications) || applications.length === 0) {
                continue;
            }

            const applicants = applications.map((app) => {
                const parsed = ApplicationItemSchema.safeParse(app);
                if (!parsed.success) {
                    throw new Error('Invalid application item from BambooHR');
                }
                const item = parsed.data;
                return {
                    id: String(item.id),
                    appliedDate: item.appliedDate,
                    statusId: item.status?.id,
                    statusLabel: item.status?.label,
                    rating: item.rating ?? undefined,
                    applicantId: item.applicant?.id,
                    firstName: item.applicant?.firstName,
                    lastName: item.applicant?.lastName,
                    avatar: item.applicant?.avatar ?? undefined,
                    email: item.applicant?.email ?? undefined,
                    source: item.applicant?.source ?? undefined,
                    jobId: item.job?.id,
                    jobTitleId: item.job?.title?.id ?? undefined,
                    jobTitleLabel: item.job?.title?.label
                };
            });

            await nango.batchSave(applicants, 'Applicant');
            lastProcessedAppliedDate = applicants[applicants.length - 1]?.appliedDate;

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    page
                });
            }
        }

        await nango.saveCheckpoint({
            updated_after: lastProcessedAppliedDate ?? updatedAfter,
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
