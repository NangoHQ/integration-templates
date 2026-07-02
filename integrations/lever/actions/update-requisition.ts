import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    requisitionId: z.string().describe('Requisition ID. Example: "52881d44-4f95-4fcb-bf28-2b344ea58889"'),
    requisitionCode: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    hiringManager: z.string().optional(),
    owner: z.string().optional(),
    headcountTotal: z.number().optional(),
    employmentStatus: z.string().optional(),
    location: z.string().optional(),
    team: z.string().optional(),
    internalNotes: z.string().optional(),
    backfill: z.boolean().optional(),
    compensationBand: z
        .object({
            currency: z.string().optional(),
            interval: z.string().optional(),
            min: z.number().optional(),
            max: z.number().optional()
        })
        .optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
    postingIds: z.array(z.string()).optional()
});

const ProviderRequisitionSchema = z
    .object({
        id: z.string(),
        requisitionCode: z.string(),
        name: z.string().nullable().optional(),
        backfill: z.boolean().nullable().optional(),
        confidentiality: z.string().nullable().optional(),
        createdAt: z.number().nullable().optional(),
        creator: z.string().nullable().optional(),
        headcountHired: z.union([z.number(), z.string()]).nullable().optional(),
        headcountTotal: z.number().nullable().optional(),
        status: z.string().nullable().optional(),
        hiringManager: z.string().nullable().optional(),
        owner: z.string().nullable().optional(),
        compensationBand: z
            .object({
                currency: z.string().optional(),
                interval: z.string().optional(),
                min: z.number().optional(),
                max: z.number().optional()
            })
            .nullable()
            .optional(),
        employmentStatus: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        internalNotes: z.string().nullable().optional(),
        postings: z.array(z.string()).nullable().optional(),
        postingIds: z.array(z.string()).nullable().optional(),
        team: z.string().nullable().optional(),
        department: z.string().nullable().optional(),
        offerIds: z.array(z.string()).nullable().optional(),
        approval: z.unknown().nullable().optional(),
        customFields: z.record(z.string(), z.unknown()).nullable().optional(),
        closedAt: z.number().nullable().optional(),
        updatedAt: z.number().nullable().optional(),
        timeToFillStartAt: z.number().nullable().optional(),
        timeToFillEndAt: z.number().nullable().optional()
    })
    .passthrough();

const LeverSingleResponseSchema = z.object({
    data: ProviderRequisitionSchema
});

const OutputSchema = ProviderRequisitionSchema;

const action = createAction({
    description: 'Update an existing requisition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['requisitions:write:admin'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const getConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#requisitions
            endpoint: `/v1/requisitions/${encodeURIComponent(input.requisitionId)}`,
            retries: 3
        };

        const getResponse = await nango.get(getConfig);
        const getWrapper = LeverSingleResponseSchema.parse(getResponse.data);
        const existing = getWrapper.data;

        const merged: Record<string, unknown> = {};

        const setIfPresent = (key: string, value: unknown) => {
            if (value !== null && value !== undefined) {
                merged[key] = value;
            }
        };

        setIfPresent('requisitionCode', existing.requisitionCode);
        setIfPresent('name', existing.name);
        setIfPresent('backfill', existing.backfill);
        setIfPresent('compensationBand', existing.compensationBand);
        setIfPresent('createdAt', existing.createdAt);
        setIfPresent('customFields', existing.customFields);
        setIfPresent('employmentStatus', existing.employmentStatus);
        setIfPresent('hiringManager', existing.hiringManager);
        setIfPresent('internalNotes', existing.internalNotes);
        setIfPresent('location', existing.location);
        setIfPresent('owner', existing.owner);
        setIfPresent('status', existing.status);
        setIfPresent('team', existing.team);
        setIfPresent('headcountTotal', existing.headcountTotal);

        if (existing.postings !== null && existing.postings !== undefined) {
            merged['postingIds'] = existing.postings;
        } else if (existing.postingIds !== null && existing.postingIds !== undefined) {
            merged['postingIds'] = existing.postingIds;
        }

        if (input.requisitionCode !== undefined) {
            merged['requisitionCode'] = input.requisitionCode;
        }
        if (input.name !== undefined) {
            merged['name'] = input.name;
        }
        if (input.status !== undefined) {
            merged['status'] = input.status;
        }
        if (input.hiringManager !== undefined) {
            merged['hiringManager'] = input.hiringManager;
        }
        if (input.owner !== undefined) {
            merged['owner'] = input.owner;
        }
        if (input.headcountTotal !== undefined) {
            merged['headcountTotal'] = input.headcountTotal;
        }
        if (input.employmentStatus !== undefined) {
            merged['employmentStatus'] = input.employmentStatus;
        }
        if (input.location !== undefined) {
            merged['location'] = input.location;
        }
        if (input.team !== undefined) {
            merged['team'] = input.team;
        }
        if (input.internalNotes !== undefined) {
            merged['internalNotes'] = input.internalNotes;
        }
        if (input.backfill !== undefined) {
            merged['backfill'] = input.backfill;
        }
        if (input.compensationBand !== undefined) {
            merged['compensationBand'] = input.compensationBand;
        }
        if (input.customFields !== undefined) {
            merged['customFields'] = input.customFields;
        }
        if (input.postingIds !== undefined) {
            merged['postingIds'] = input.postingIds;
        }

        const putConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#requisitions
            endpoint: `/v1/requisitions/${encodeURIComponent(input.requisitionId)}`,
            data: merged,
            retries: 10
        };

        const putResponse = await nango.put(putConfig);
        const putRaw = putResponse.data;

        if (putRaw !== null && typeof putRaw === 'object' && 'data' in putRaw) {
            const putWrapper = LeverSingleResponseSchema.parse(putRaw);
            return putWrapper.data;
        }

        return ProviderRequisitionSchema.parse(putRaw);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
