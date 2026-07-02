import { z } from 'zod';
import { createAction } from 'nango';

const RequisitionSchema = z
    .object({
        id: z.string(),
        requisitionCode: z.string(),
        name: z.string().optional(),
        backfill: z.boolean().optional(),
        confidentiality: z.string().optional(),
        createdAt: z.number().optional(),
        creator: z.string().nullable().optional(),
        headcountHired: z.union([z.number(), z.string()]).optional(),
        headcountTotal: z.union([z.number(), z.string()]).optional(),
        status: z.string().optional(),
        hiringManager: z.string().nullable().optional(),
        owner: z.string().nullable().optional(),
        employmentStatus: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        internalNotes: z.string().nullable().optional(),
        department: z.string().nullable().optional(),
        team: z.string().nullable().optional()
    })
    .passthrough();

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of results to return per page. Max 100.'),
    status: z.string().optional().describe('Filter by requisition status, e.g. "open" or "closed".'),
    confidentiality: z.string().optional().describe('Filter by confidentiality: "confidential", "non-confidential", or "all".'),
    requisitionCode: z.string().optional().describe('Filter by non-Lever requisition code.'),
    createdAtStart: z.number().optional().describe('Filter by created datetime (start of range, inclusive).'),
    createdAtEnd: z.number().optional().describe('Filter by created datetime (end of range, inclusive).')
});

const OutputSchema = z.object({
    data: z.array(RequisitionSchema),
    hasNext: z.boolean(),
    next: z.string().optional()
});

const action = createAction({
    description: 'List all requisitions on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['requisitions:read:admin'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation#list-all-requisitions
            endpoint: '/v1/requisitions',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.confidentiality !== undefined && { confidentiality: input.confidentiality }),
                ...(input.requisitionCode !== undefined && { requisition_code: input.requisitionCode }),
                ...(input.createdAtStart !== undefined && { created_at_start: String(input.createdAtStart) }),
                ...(input.createdAtEnd !== undefined && { created_at_end: String(input.createdAtEnd) })
            },
            retries: 3
        });

        const listResponse = OutputSchema.parse(response.data);

        return {
            data: listResponse.data,
            hasNext: listResponse.hasNext,
            ...(listResponse.next !== undefined && { next: listResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
