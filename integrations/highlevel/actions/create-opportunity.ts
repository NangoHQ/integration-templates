import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    locationId: z.string().describe('Location ID. Example: "ve9EPM428h8vShlRW1KT"'),
    pipelineId: z.string().describe('Pipeline ID. Example: "VDm7RPYC2GLUvdpKmBfC"'),
    pipelineStageId: z.string().optional().describe('Pipeline stage ID. Example: "7915dedc-8f18-44d5-8bc3-77c04e994a10"'),
    name: z.string().describe('Opportunity name. Example: "First Opps"'),
    status: z.enum(['open', 'won', 'lost', 'abandoned', 'all']).describe('Opportunity status'),
    contactId: z.string().describe('Contact ID. Example: "mTkSCb1UBjb5tk4OvB69"'),
    monetaryValue: z.number().optional().describe('Monetary value. Example: 220'),
    assignedTo: z.string().optional().describe('User ID to assign. Example: "082goXVW3lIExEQPOnd3"')
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    monetaryValue: z.number().optional(),
    pipelineId: z.string().optional(),
    pipelineStageId: z.string().optional(),
    assignedTo: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    lastStatusChangeAt: z.string().optional(),
    lastStageChangeAt: z.string().optional(),
    lastActionDate: z.string().optional(),
    indexVersion: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contactId: z.string().optional(),
    locationId: z.string().optional()
});

const ProviderResponseSchema = z.object({
    opportunity: ProviderOpportunitySchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    monetaryValue: z.number().optional(),
    pipelineId: z.string().optional(),
    pipelineStageId: z.string().optional(),
    assignedTo: z.string().optional(),
    status: z.string().optional(),
    contactId: z.string().optional(),
    locationId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create an opportunity in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://marketplace.gohighlevel.com/docs/ghl/opportunities/create-opportunity/
            endpoint: '/opportunities/',
            headers: {
                Version: '2021-07-28'
            },
            data: {
                locationId: input.locationId,
                pipelineId: input.pipelineId,
                name: input.name,
                status: input.status,
                contactId: input.contactId,
                ...(input.pipelineStageId !== undefined && { pipelineStageId: input.pipelineStageId }),
                ...(input.monetaryValue !== undefined && { monetaryValue: input.monetaryValue }),
                ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from HighLevel API'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const opportunity = parsed.opportunity;

        return {
            id: opportunity.id,
            ...(opportunity.name !== undefined && { name: opportunity.name }),
            ...(opportunity.monetaryValue !== undefined && { monetaryValue: opportunity.monetaryValue }),
            ...(opportunity.pipelineId !== undefined && { pipelineId: opportunity.pipelineId }),
            ...(opportunity.pipelineStageId !== undefined && { pipelineStageId: opportunity.pipelineStageId }),
            ...(opportunity.assignedTo !== undefined && { assignedTo: opportunity.assignedTo }),
            ...(opportunity.status !== undefined && { status: opportunity.status }),
            ...(opportunity.contactId !== undefined && { contactId: opportunity.contactId }),
            ...(opportunity.locationId !== undefined && { locationId: opportunity.locationId }),
            ...(opportunity.createdAt !== undefined && { createdAt: opportunity.createdAt }),
            ...(opportunity.updatedAt !== undefined && { updatedAt: opportunity.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
