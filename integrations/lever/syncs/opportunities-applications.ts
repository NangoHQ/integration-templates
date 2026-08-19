import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const PhoneSchema = z.object({
    type: z.string().nullable().optional(),
    value: z.string().optional()
});

const RequisitionForHireSchema = z.object({
    id: z.string(),
    requisitionCode: z.string(),
    hiringManagerOnHire: z.string().optional()
});

const ArchivedSchema = z.object({
    reason: z.string(),
    archivedAt: z.number()
});

const ApplicationResponse = z
    .object({
        id: z.string(),
        opportunityId: z.string(),
        candidateId: z.string(),
        createdAt: z.number(),
        type: z.string(),
        posting: z.string().nullable().optional(),
        postingHiringManager: z.string().nullable().optional(),
        postingOwner: z.string().nullable().optional(),
        user: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: PhoneSchema.nullable().optional(),
        requisitionForHire: RequisitionForHireSchema.nullable().optional(),
        ownerId: z.string().nullable().optional(),
        hiringManager: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        links: z.string().array().nullable().optional(),
        comments: z.string().nullable().optional(),
        customQuestions: z.unknown().array().nullable().optional(),
        archived: ArchivedSchema.nullable().optional()
    })
    .passthrough();

const OpportunityResponse = z
    .object({
        id: z.string()
    })
    .passthrough();

const LeverOpportunityApplication = z.object({
    id: z.string(),
    opportunityId: z.string(),
    candidateId: z.string(),
    createdAt: z.number(),
    type: z.string(),
    posting: z.string().nullable().optional(),
    postingHiringManager: z.string().nullable().optional(),
    postingOwner: z.string().nullable().optional(),
    user: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: PhoneSchema.nullable().optional(),
    requisitionForHire: RequisitionForHireSchema.nullable().optional(),
    ownerId: z.string().nullable().optional(),
    hiringManager: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    links: z.string().array().nullable().optional(),
    comments: z.string().nullable().optional(),
    customQuestions: z.unknown().array().nullable().optional(),
    archived: ArchivedSchema.nullable().optional()
});

const CheckpointSchema = z.object({
    opportunityOffset: z.string(),
    opportunityIndex: z.number(),
    applicationCursor: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all applications for a candidate in Lever',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',
    scopes: ['applications:read:admin'],
    metadata: z.object({}),
    checkpoint: CheckpointSchema,
    models: {
        LeverOpportunityApplication: LeverOpportunityApplication
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;

        await nango.trackDeletesStart('LeverOpportunityApplication');

        let nextOpportunityOffset = checkpoint?.opportunityOffset ?? '';
        let currentOpportunityOffset = nextOpportunityOffset;
        let applicationCursor = checkpoint?.applicationCursor ?? '';
        let totalRecords = 0;
        let consumedCheckpoint = false;

        const opportunitiesConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-opportunities
            endpoint: '/v1/opportunities',
            params: {
                ...(nextOpportunityOffset && { offset: nextOpportunityOffset }),
                limit: LIMIT
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT,
                on_page: async ({ nextPageParam }) => {
                    currentOpportunityOffset = nextOpportunityOffset;
                    nextOpportunityOffset = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const opportunityBatch of nango.paginate(opportunitiesConfig)) {
            if (!consumedCheckpoint && checkpoint && checkpoint.opportunityIndex >= opportunityBatch.length) {
                consumedCheckpoint = true;
                await nango.saveCheckpoint({
                    opportunityOffset: nextOpportunityOffset,
                    opportunityIndex: 0,
                    applicationCursor: ''
                });
                continue;
            }

            const resumeOpportunityIndex = !consumedCheckpoint && checkpoint ? checkpoint.opportunityIndex : -1;
            const startIndex = resumeOpportunityIndex >= 0 ? resumeOpportunityIndex : 0;
            consumedCheckpoint = true;

            for (let i = startIndex; i < opportunityBatch.length; i++) {
                const opportunity = OpportunityResponse.parse(opportunityBatch[i]);

                if (i !== resumeOpportunityIndex) {
                    applicationCursor = '';
                }

                const appConfig: ProxyConfiguration = {
                    // https://hire.lever.co/developer/documentation#list-all-applications
                    endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/applications`,
                    params: {
                        ...(applicationCursor && { offset: applicationCursor }),
                        limit: LIMIT
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_path_in_response: 'next',
                        cursor_name_in_request: 'offset',
                        limit_name_in_request: 'limit',
                        response_path: 'data',
                        limit: LIMIT,
                        on_page: async ({ nextPageParam }) => {
                            applicationCursor = typeof nextPageParam === 'string' ? nextPageParam : '';
                        }
                    },
                    retries: 3
                };

                for await (const batch of nango.paginate(appConfig)) {
                    const parsed = z.array(ApplicationResponse).parse(batch);
                    const mapped = parsed.map(mapApplication);
                    const batchSize = mapped.length;
                    totalRecords += batchSize;
                    await nango.log(`Saving batch of ${batchSize} application(s) for opportunity ${opportunity.id} (total application(s): ${totalRecords})`);
                    await nango.batchSave(mapped, 'LeverOpportunityApplication');

                    if (applicationCursor !== '') {
                        await nango.saveCheckpoint({
                            opportunityOffset: currentOpportunityOffset,
                            opportunityIndex: i,
                            applicationCursor
                        });
                    }
                }

                await nango.saveCheckpoint({
                    opportunityOffset: currentOpportunityOffset,
                    opportunityIndex: i + 1,
                    applicationCursor: ''
                });
            }

            await nango.saveCheckpoint({
                opportunityOffset: nextOpportunityOffset,
                opportunityIndex: 0,
                applicationCursor: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LeverOpportunityApplication');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapApplication(application: z.infer<typeof ApplicationResponse>): z.infer<typeof LeverOpportunityApplication> {
    return {
        id: application.id,
        opportunityId: application.opportunityId,
        candidateId: application.candidateId,
        createdAt: application.createdAt,
        type: application.type,
        posting: application.posting,
        postingHiringManager: application.postingHiringManager,
        postingOwner: application.postingOwner,
        user: application.user,
        name: application.name,
        email: application.email,
        phone: application.phone,
        requisitionForHire: application.requisitionForHire,
        ownerId: application.ownerId,
        hiringManager: application.hiringManager,
        company: application.company,
        links: application.links,
        comments: application.comments,
        customQuestions: application.customQuestions,
        archived: application.archived
    };
}
