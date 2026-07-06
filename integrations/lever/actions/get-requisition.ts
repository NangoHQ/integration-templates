import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Requisition ID. Example: "52881d44-4f95-4fcb-bf28-2b344ea58889"')
});

const CompensationBandSchema = z.object({
    currency: z.string().nullish(),
    interval: z.string().nullish(),
    min: z.number().nullish(),
    max: z.number().nullish()
});

const ApproverSchema = z.object({
    id: z.string().nullish(),
    user: z.union([z.string(), z.object({ userId: z.string().nullish(), email: z.string().nullish() })]).nullish(),
    isDynamic: z.boolean().nullish(),
    approved: z.boolean().nullish(),
    approvedAt: z.number().nullish(),
    type: z.string().nullish(),
    overridingUserId: z.string().nullish()
});

const ApprovalStepSchema = z.object({
    completed: z.boolean().nullish(),
    status: z.string().nullish(),
    outOfBandOnly: z.boolean().nullish(),
    approvalsRequired: z.number().nullish(),
    approvers: z.array(ApproverSchema).nullish()
});

const ApprovalSchema = z.object({
    id: z.string().nullish(),
    status: z.string().nullish(),
    startedAt: z.number().nullish(),
    approvedAt: z.number().nullish(),
    steps: z.array(ApprovalStepSchema).nullish(),
    accountId: z.string().nullish(),
    createdBy: z.string().nullish()
});

const RequisitionSchema = z
    .object({
        id: z.string(),
        requisitionCode: z.string().nullish(),
        name: z.string().nullish(),
        backfill: z.boolean().nullish(),
        confidentiality: z.string().nullish(),
        createdAt: z.number().nullish(),
        creator: z.string().nullish(),
        headcountHired: z.union([z.number(), z.string()]).nullish(),
        headcountTotal: z.union([z.number(), z.string()]).nullish(),
        status: z.string().nullish(),
        hiringManager: z.string().nullish(),
        owner: z.string().nullish(),
        compensationBand: CompensationBandSchema.nullish(),
        employmentStatus: z.string().nullish(),
        location: z.string().nullish(),
        internalNotes: z.string().nullish(),
        postings: z.array(z.string()).nullish(),
        department: z.string().nullish(),
        team: z.string().nullish(),
        offerIds: z.array(z.string()).nullish(),
        approval: ApprovalSchema.nullish(),
        customFields: z.record(z.string(), z.unknown()).nullish(),
        closedAt: z.number().nullish(),
        timeToFillStartAt: z.number().nullish(),
        timeToFillEndAt: z.number().nullish(),
        updatedAt: z.number().nullish()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single requisition.',
    version: '1.0.0',
    input: InputSchema,
    output: RequisitionSchema,
    scopes: ['requisitions:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof RequisitionSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#retrieve-a-single-requisition
            endpoint: `/v1/requisitions/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object' || !('data' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Requisition not found or invalid response',
                id: input.id
            });
        }

        const providerRequisition = RequisitionSchema.parse(response.data.data);

        return providerRequisition;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
