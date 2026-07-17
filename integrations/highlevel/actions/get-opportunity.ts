import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "PTdZZOMhJ8BPXrSuSSJ2"')
});

const ContactSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    companyName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const CustomFieldSchema = z.object({
    id: z.string(),
    fieldValue: z.unknown()
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
    locationId: z.string().optional(),
    contact: ContactSchema.optional(),
    notes: z.array(z.unknown()).optional(),
    tasks: z.array(z.unknown()).optional(),
    calendarEvents: z.array(z.unknown()).optional(),
    lostReasonId: z.string().optional(),
    customFields: z.array(CustomFieldSchema).optional(),
    followers: z.array(z.unknown()).optional(),
    externalObjectId: z.string().optional()
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
    source: z.string().optional(),
    lastStatusChangeAt: z.string().optional(),
    lastStageChangeAt: z.string().optional(),
    lastActionDate: z.string().optional(),
    indexVersion: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contactId: z.string().optional(),
    locationId: z.string().optional(),
    contact: ContactSchema.optional(),
    notes: z.array(z.unknown()).optional(),
    tasks: z.array(z.unknown()).optional(),
    calendarEvents: z.array(z.unknown()).optional(),
    lostReasonId: z.string().optional(),
    customFields: z.array(CustomFieldSchema).optional(),
    followers: z.array(z.unknown()).optional(),
    externalObjectId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single opportunity from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/8bda361e52c46-get-opportunity
            endpoint: `/opportunities/${encodeURIComponent(input.opportunityId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                parseError: parsed.error.message
            });
        }

        const opportunity = parsed.data.opportunity;

        return {
            id: opportunity.id,
            ...(opportunity.name !== undefined && { name: opportunity.name }),
            ...(opportunity.monetaryValue !== undefined && { monetaryValue: opportunity.monetaryValue }),
            ...(opportunity.pipelineId !== undefined && { pipelineId: opportunity.pipelineId }),
            ...(opportunity.pipelineStageId !== undefined && { pipelineStageId: opportunity.pipelineStageId }),
            ...(opportunity.assignedTo !== undefined && { assignedTo: opportunity.assignedTo }),
            ...(opportunity.status !== undefined && { status: opportunity.status }),
            ...(opportunity.source !== undefined && { source: opportunity.source }),
            ...(opportunity.lastStatusChangeAt !== undefined && { lastStatusChangeAt: opportunity.lastStatusChangeAt }),
            ...(opportunity.lastStageChangeAt !== undefined && { lastStageChangeAt: opportunity.lastStageChangeAt }),
            ...(opportunity.lastActionDate !== undefined && { lastActionDate: opportunity.lastActionDate }),
            ...(opportunity.indexVersion !== undefined && { indexVersion: opportunity.indexVersion }),
            ...(opportunity.createdAt !== undefined && { createdAt: opportunity.createdAt }),
            ...(opportunity.updatedAt !== undefined && { updatedAt: opportunity.updatedAt }),
            ...(opportunity.contactId !== undefined && { contactId: opportunity.contactId }),
            ...(opportunity.locationId !== undefined && { locationId: opportunity.locationId }),
            ...(opportunity.contact !== undefined && { contact: opportunity.contact }),
            ...(opportunity.notes !== undefined && { notes: opportunity.notes }),
            ...(opportunity.tasks !== undefined && { tasks: opportunity.tasks }),
            ...(opportunity.calendarEvents !== undefined && { calendarEvents: opportunity.calendarEvents }),
            ...(opportunity.lostReasonId !== undefined && { lostReasonId: opportunity.lostReasonId }),
            ...(opportunity.customFields !== undefined && { customFields: opportunity.customFields }),
            ...(opportunity.followers !== undefined && { followers: opportunity.followers }),
            ...(opportunity.externalObjectId !== undefined && { externalObjectId: opportunity.externalObjectId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
