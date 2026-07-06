import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RequisitionSchema = z.object({
    id: z.string(),
    requisitionCode: z.string().optional(),
    name: z.string().optional(),
    backfill: z.boolean().optional(),
    confidentiality: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    creator: z.string().optional(),
    hiringManager: z.string().optional(),
    owner: z.string().optional(),
    headcountHired: z.union([z.number(), z.string()]).optional(),
    headcountTotal: z.union([z.number(), z.string()]).optional(),
    employmentStatus: z.string().optional(),
    location: z.string().optional(),
    team: z.string().optional(),
    department: z.string().optional(),
    internalNotes: z.string().optional(),
    postings: z.array(z.string()).optional(),
    offerIds: z.array(z.string()).optional(),
    compensationBand: z
        .object({
            currency: z.string().optional(),
            interval: z.string().optional(),
            min: z.number().optional(),
            max: z.number().optional()
        })
        .optional(),
    approval: z
        .object({
            id: z.string().optional(),
            status: z.string().optional(),
            startedAt: z.number().optional(),
            approvedAt: z.number().optional(),
            accountId: z.string().optional(),
            createdBy: z.string().optional(),
            steps: z.array(z.unknown()).optional()
        })
        .optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
    closedAt: z.number().optional(),
    timeToFillStartAt: z.number().optional(),
    timeToFillEndAt: z.number().optional()
});

type Requisition = z.infer<typeof RequisitionSchema>;

const RawRequisitionSchema = z.object({
    id: z.string(),
    requisitionCode: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    backfill: z.boolean().nullable().optional(),
    confidentiality: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    createdAt: z.number().nullable().optional(),
    updatedAt: z.number().nullable().optional(),
    creator: z.string().nullable().optional(),
    hiringManager: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
    headcountHired: z.union([z.number(), z.string()]).nullable().optional(),
    headcountTotal: z.union([z.number(), z.string()]).nullable().optional(),
    employmentStatus: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    team: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    internalNotes: z.string().nullable().optional(),
    postings: z.array(z.string()).nullable().optional(),
    offerIds: z.array(z.string()).nullable().optional(),
    compensationBand: z
        .object({
            currency: z.string().nullable().optional(),
            interval: z.string().nullable().optional(),
            min: z.number().nullable().optional(),
            max: z.number().nullable().optional()
        })
        .nullable()
        .optional(),
    approval: z
        .object({
            id: z.string().nullable().optional(),
            status: z.string().nullable().optional(),
            startedAt: z.number().nullable().optional(),
            approvedAt: z.number().nullable().optional(),
            accountId: z.string().nullable().optional(),
            createdBy: z.string().nullable().optional(),
            steps: z.array(z.unknown()).nullable().optional()
        })
        .nullable()
        .optional(),
    customFields: z.record(z.string(), z.unknown()).nullable().optional(),
    closedAt: z.number().nullable().optional(),
    timeToFillStartAt: z.number().nullable().optional(),
    timeToFillEndAt: z.number().nullable().optional()
});

const sync = createSync({
    description: 'Fetches all requisitions on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Requisition: RequisitionSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v1/requisitions does not support an updated_after or modified_since
        // filter, nor any cursor-based change feed. Only created_at_start/end, requisition_code,
        // status, and confidentiality filters are available, so incremental checkpoints are not viable.
        await nango.trackDeletesStart('Requisition');

        const proxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/requisitions',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawRequisitions = z.array(RawRequisitionSchema).safeParse(page);

            if (!rawRequisitions.success) {
                throw new Error(`Failed to parse requisitions: ${rawRequisitions.error.message}`);
            }

            const requisitions: Requisition[] = rawRequisitions.data.map((raw) => ({
                id: raw.id,
                ...(raw.requisitionCode != null && { requisitionCode: raw.requisitionCode }),
                ...(raw.name != null && { name: raw.name }),
                ...(raw.backfill != null && { backfill: raw.backfill }),
                ...(raw.confidentiality != null && { confidentiality: raw.confidentiality }),
                ...(raw.status != null && { status: raw.status }),
                ...(raw.createdAt != null && { createdAt: raw.createdAt }),
                ...(raw.updatedAt != null && { updatedAt: raw.updatedAt }),
                ...(raw.creator != null && { creator: raw.creator }),
                ...(raw.hiringManager != null && { hiringManager: raw.hiringManager }),
                ...(raw.owner != null && { owner: raw.owner }),
                ...(raw.headcountHired != null && { headcountHired: raw.headcountHired }),
                ...(raw.headcountTotal != null && { headcountTotal: raw.headcountTotal }),
                ...(raw.employmentStatus != null && { employmentStatus: raw.employmentStatus }),
                ...(raw.location != null && { location: raw.location }),
                ...(raw.team != null && { team: raw.team }),
                ...(raw.department != null && { department: raw.department }),
                ...(raw.internalNotes != null && { internalNotes: raw.internalNotes }),
                ...(raw.postings != null && { postings: raw.postings }),
                ...(raw.offerIds != null && { offerIds: raw.offerIds }),
                ...(raw.compensationBand != null && {
                    compensationBand: {
                        ...(raw.compensationBand.currency != null && { currency: raw.compensationBand.currency }),
                        ...(raw.compensationBand.interval != null && { interval: raw.compensationBand.interval }),
                        ...(raw.compensationBand.min != null && { min: raw.compensationBand.min }),
                        ...(raw.compensationBand.max != null && { max: raw.compensationBand.max })
                    }
                }),
                ...(raw.approval != null && {
                    approval: {
                        ...(raw.approval.id != null && { id: raw.approval.id }),
                        ...(raw.approval.status != null && { status: raw.approval.status }),
                        ...(raw.approval.startedAt != null && { startedAt: raw.approval.startedAt }),
                        ...(raw.approval.approvedAt != null && { approvedAt: raw.approval.approvedAt }),
                        ...(raw.approval.accountId != null && { accountId: raw.approval.accountId }),
                        ...(raw.approval.createdBy != null && { createdBy: raw.approval.createdBy }),
                        ...(raw.approval.steps != null && { steps: raw.approval.steps })
                    }
                }),
                ...(raw.customFields != null && { customFields: raw.customFields }),
                ...(raw.closedAt != null && { closedAt: raw.closedAt }),
                ...(raw.timeToFillStartAt != null && { timeToFillStartAt: raw.timeToFillStartAt }),
                ...(raw.timeToFillEndAt != null && { timeToFillEndAt: raw.timeToFillEndAt })
            }));

            if (requisitions.length > 0) {
                await nango.batchSave(requisitions, 'Requisition');
            }
        }

        await nango.trackDeletesEnd('Requisition');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
