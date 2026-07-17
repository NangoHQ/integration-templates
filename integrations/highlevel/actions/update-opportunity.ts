import { z } from 'zod';
import { createAction } from 'nango';

const CustomFieldInputSchema = z.object({
    id: z.string().describe('Custom field ID. Example: "6dvNaf7VhkQ9snc5vnjJ"'),
    key: z.string().optional().describe('Custom field key. Example: "my_custom_field"'),
    field_value: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))]).optional()
});

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "yWQobCRIhRguQtD2llvk"'),
    pipelineId: z.string().optional().describe('Pipeline ID. Example: "bCkKGpDsyPP4peuKowkG"'),
    name: z.string().optional().describe('Opportunity name. Example: "First Opps"'),
    pipelineStageId: z.string().optional().describe('Pipeline stage ID. Example: "7915dedc-8f18-44d5-8bc3-77c04e994a10"'),
    status: z.enum(['open', 'won', 'lost', 'abandoned', 'all']).optional().describe('Opportunity status'),
    monetaryValue: z.number().optional().describe('Monetary value. Example: 220'),
    assignedTo: z.string().optional().describe('User ID the opportunity is assigned to. Example: "082goXVW3lIExEQPOnd3"'),
    customFields: z.array(CustomFieldInputSchema).optional().describe('Custom fields to update')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    companyName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const ProviderCustomFieldSchema = z.object({
    id: z.string(),
    fieldValue: z.unknown().optional()
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
    indexVersion: z.union([z.string(), z.number()]).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contactId: z.string().optional(),
    locationId: z.string().optional(),
    contact: ProviderContactSchema.optional(),
    notes: z.array(z.unknown()).optional(),
    tasks: z.array(z.unknown()).optional(),
    calendarEvents: z.array(z.unknown()).optional(),
    lostReasonId: z.string().optional(),
    customFields: z.array(ProviderCustomFieldSchema).optional(),
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
    indexVersion: z.union([z.string(), z.number()]).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contactId: z.string().optional(),
    locationId: z.string().optional(),
    contact: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            companyName: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            tags: z.array(z.string()).optional()
        })
        .optional(),
    notes: z.array(z.unknown()).optional(),
    tasks: z.array(z.unknown()).optional(),
    calendarEvents: z.array(z.unknown()).optional(),
    lostReasonId: z.string().optional(),
    customFields: z
        .array(
            z.object({
                id: z.string(),
                fieldValue: z.unknown().optional()
            })
        )
        .optional(),
    followers: z.array(z.unknown()).optional(),
    externalObjectId: z.string().optional()
});

const action = createAction({
    description: 'Update an opportunity in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://highlevel.stoplight.io/docs/integrations/65e7a8f0a516a-update-opportunity
        const response = await nango.put({
            endpoint: `/opportunities/${encodeURIComponent(input.opportunityId)}`,
            headers: {
                Version: '2021-07-28'
            },
            data: {
                ...(input.pipelineId !== undefined && { pipelineId: input.pipelineId }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.pipelineStageId !== undefined && { pipelineStageId: input.pipelineStageId }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.monetaryValue !== undefined && { monetaryValue: input.monetaryValue }),
                ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
                ...(input.customFields !== undefined && { customFields: input.customFields })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                cause: parsed.error.message
            });
        }

        const opp = parsed.data.opportunity;

        return {
            id: opp.id,
            ...(opp.name !== undefined && { name: opp.name }),
            ...(opp.monetaryValue !== undefined && { monetaryValue: opp.monetaryValue }),
            ...(opp.pipelineId !== undefined && { pipelineId: opp.pipelineId }),
            ...(opp.pipelineStageId !== undefined && { pipelineStageId: opp.pipelineStageId }),
            ...(opp.assignedTo !== undefined && { assignedTo: opp.assignedTo }),
            ...(opp.status !== undefined && { status: opp.status }),
            ...(opp.source !== undefined && { source: opp.source }),
            ...(opp.lastStatusChangeAt !== undefined && { lastStatusChangeAt: opp.lastStatusChangeAt }),
            ...(opp.lastStageChangeAt !== undefined && { lastStageChangeAt: opp.lastStageChangeAt }),
            ...(opp.lastActionDate !== undefined && { lastActionDate: opp.lastActionDate }),
            ...(opp.indexVersion !== undefined && { indexVersion: opp.indexVersion }),
            ...(opp.createdAt !== undefined && { createdAt: opp.createdAt }),
            ...(opp.updatedAt !== undefined && { updatedAt: opp.updatedAt }),
            ...(opp.contactId !== undefined && { contactId: opp.contactId }),
            ...(opp.locationId !== undefined && { locationId: opp.locationId }),
            ...(opp.contact !== undefined && {
                contact: {
                    id: opp.contact.id,
                    ...(opp.contact.name !== undefined && { name: opp.contact.name }),
                    ...(opp.contact.companyName !== undefined && { companyName: opp.contact.companyName }),
                    ...(opp.contact.email !== undefined && { email: opp.contact.email }),
                    ...(opp.contact.phone !== undefined && { phone: opp.contact.phone }),
                    ...(opp.contact.tags !== undefined && { tags: opp.contact.tags })
                }
            }),
            ...(opp.notes !== undefined && { notes: opp.notes }),
            ...(opp.tasks !== undefined && { tasks: opp.tasks }),
            ...(opp.calendarEvents !== undefined && { calendarEvents: opp.calendarEvents }),
            ...(opp.lostReasonId !== undefined && { lostReasonId: opp.lostReasonId }),
            ...(opp.customFields !== undefined && { customFields: opp.customFields }),
            ...(opp.followers !== undefined && { followers: opp.followers }),
            ...(opp.externalObjectId !== undefined && { externalObjectId: opp.externalObjectId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
