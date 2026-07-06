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

const sync = createSync({
    description: 'Fetches a list of all applications for a candidate in Lever',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',
    scopes: ['applications:read:admin'],
    metadata: z.object({}),
    models: {
        LeverOpportunityApplication: LeverOpportunityApplication
    },

    exec: async (nango) => {
        let totalRecords = 0;

        const opportunities = await getAllOpportunities(nango);

        for (const opportunity of opportunities) {
            const config: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-all-applications
                endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/applications`,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'next',
                    cursor_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'data',
                    limit: LIMIT
                },
                retries: 3
            };

            for await (const batch of nango.paginate(config)) {
                const parsed = z.array(ApplicationResponse).parse(batch);
                const mapped = parsed.map(mapApplication);
                const batchSize = mapped.length;
                totalRecords += batchSize;
                await nango.log(`Saving batch of ${batchSize} application(s) for opportunity ${opportunity.id} (total application(s): ${totalRecords})`);
                await nango.batchSave(mapped, 'LeverOpportunityApplication');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllOpportunities(nango: NangoSyncLocal) {
    const records: Array<z.infer<typeof OpportunityResponse>> = [];
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-opportunities
        endpoint: '/v1/opportunities',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next',
            cursor_name_in_request: 'offset',
            limit_name_in_request: 'limit',
            response_path: 'data',
            limit: LIMIT
        },
        retries: 3
    };

    for await (const batch of nango.paginate(config)) {
        for (const record of batch) {
            const opportunity = OpportunityResponse.parse(record);
            records.push(opportunity);
        }
    }

    return records;
}

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
