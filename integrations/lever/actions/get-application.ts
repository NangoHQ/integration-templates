import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    applicationId: z.string().describe('Application ID. Example: "7278da68-141b-4203-b209-8ca6c0fa1f2d"')
});

const ProviderPhoneSchema = z.object({
    type: z.string().nullable().optional(),
    value: z.string().nullable().optional()
});

const ProviderArchivedSchema = z.object({
    archivedAt: z.number().nullable().optional(),
    reason: z.string().nullable().optional()
});

const ProviderRequisitionForHireSchema = z.object({
    id: z.string(),
    requisitionCode: z.string(),
    hiringManagerOnHire: z.string().nullable().optional()
});

const ProviderApplicationSchema = z.object({
    id: z.string(),
    opportunityId: z.string(),
    candidateId: z.string().optional(),
    createdAt: z.number(),
    type: z.string(),
    posting: z.string().nullable().optional(),
    postingOwner: z.string().nullable().optional(),
    postingHiringManager: z.string().nullable().optional(),
    user: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: ProviderPhoneSchema.nullable().optional(),
    company: z.string().nullable().optional(),
    links: z.array(z.string()).nullable().optional(),
    comments: z.string().nullable().optional(),
    resume: z.string().nullable().optional(),
    customQuestions: z.array(z.unknown()).nullable().optional(),
    ipAddress: z.string().nullable().optional(),
    referer: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    acceptLanguage: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    archived: ProviderArchivedSchema.nullable().optional(),
    requisitionForHire: ProviderRequisitionForHireSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    opportunityId: z.string(),
    candidateId: z.string().optional(),
    createdAt: z.number(),
    type: z.string(),
    posting: z.string().optional(),
    resume: z.string().optional(),
    postingOwner: z.string().optional(),
    postingHiringManager: z.string().optional(),
    user: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: ProviderPhoneSchema.optional(),
    company: z.string().optional(),
    links: z.array(z.string()).optional(),
    comments: z.string().optional(),
    customQuestions: z.array(z.unknown()).optional(),
    ipAddress: z.string().optional(),
    referer: z.string().optional(),
    userAgent: z.string().optional(),
    acceptLanguage: z.string().optional(),
    timezone: z.string().optional(),
    archived: ProviderArchivedSchema.optional(),
    requisitionForHire: ProviderRequisitionForHireSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single application on an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['applications:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation#retrieve-a-single-application
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/applications/${encodeURIComponent(input.applicationId)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('data' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Application not found',
                opportunityId: input.opportunityId,
                applicationId: input.applicationId
            });
        }

        const providerApplication = ProviderApplicationSchema.parse(response.data.data);

        return {
            id: providerApplication.id,
            opportunityId: providerApplication.opportunityId,
            ...(providerApplication.candidateId != null && { candidateId: providerApplication.candidateId }),
            createdAt: providerApplication.createdAt,
            type: providerApplication.type,
            ...(providerApplication.posting != null && { posting: providerApplication.posting }),
            ...(providerApplication.resume != null && { resume: providerApplication.resume }),
            ...(providerApplication.postingOwner != null && { postingOwner: providerApplication.postingOwner }),
            ...(providerApplication.postingHiringManager != null && { postingHiringManager: providerApplication.postingHiringManager }),
            ...(providerApplication.user != null && { user: providerApplication.user }),
            ...(providerApplication.name != null && { name: providerApplication.name }),
            ...(providerApplication.email != null && { email: providerApplication.email }),
            ...(providerApplication.phone != null && { phone: providerApplication.phone }),
            ...(providerApplication.company != null && { company: providerApplication.company }),
            ...(providerApplication.links != null && { links: providerApplication.links }),
            ...(providerApplication.comments != null && { comments: providerApplication.comments }),
            ...(providerApplication.customQuestions != null && { customQuestions: providerApplication.customQuestions }),
            ...(providerApplication.ipAddress != null && { ipAddress: providerApplication.ipAddress }),
            ...(providerApplication.referer != null && { referer: providerApplication.referer }),
            ...(providerApplication.userAgent != null && { userAgent: providerApplication.userAgent }),
            ...(providerApplication.acceptLanguage != null && { acceptLanguage: providerApplication.acceptLanguage }),
            ...(providerApplication.timezone != null && { timezone: providerApplication.timezone }),
            ...(providerApplication.archived != null && { archived: providerApplication.archived }),
            ...(providerApplication.requisitionForHire != null && { requisitionForHire: providerApplication.requisitionForHire })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
