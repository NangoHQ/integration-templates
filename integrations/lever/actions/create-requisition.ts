import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the requisition. Example: "Senior Engineer"'),
    requisitionCode: z.string().describe('Unique code for the requisition. Example: "ENG-001"'),
    headcountTotal: z.number().describe('Total headcount for the requisition. Example: 1'),
    employmentStatus: z.string().describe('Employment status for the requisition. Example: "full-time"'),
    location: z.string().describe('Location of the requisition. Example: "San Francisco, CA"'),
    team: z.string().describe('Team for the requisition. Example: "Engineering"')
});

const ProviderRequisitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    requisitionCode: z.string(),
    headcountTotal: z.union([z.number(), z.string()]),
    employmentStatus: z.string(),
    location: z.string(),
    team: z.string(),
    department: z.string().optional()
});

const ProviderCreateResponseSchema = z.object({
    data: ProviderRequisitionSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    requisitionCode: z.string(),
    headcountTotal: z.union([z.number(), z.string()]),
    employmentStatus: z.string(),
    location: z.string(),
    team: z.string(),
    department: z.string().optional()
});

const action = createAction({
    description: 'Create a new requisition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/requisitions',
            data: {
                name: input.name,
                requisitionCode: input.requisitionCode,
                headcountTotal: input.headcountTotal,
                employmentStatus: input.employmentStatus,
                location: input.location,
                team: input.team
            },
            retries: 1
        });

        const providerResponse = ProviderCreateResponseSchema.parse(response.data);
        const providerRequisition = providerResponse.data;

        return {
            id: providerRequisition.id,
            name: providerRequisition.name,
            requisitionCode: providerRequisition.requisitionCode,
            headcountTotal: providerRequisition.headcountTotal,
            employmentStatus: providerRequisition.employmentStatus,
            location: providerRequisition.location,
            team: providerRequisition.team,
            ...(providerRequisition.department !== undefined && { department: providerRequisition.department })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
