import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    applicationId: z.number().int().describe('Application ID. Example: 123')
});

const ProviderJobTitleSchema = z.object({
    id: z.number().nullable(),
    label: z.string().nullable()
});

const ProviderUserSchema = z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    avatar: z.string().nullable(),
    jobTitle: ProviderJobTitleSchema.nullable()
});

const ProviderStatusSchema = z.object({
    id: z.number(),
    label: z.string(),
    dateChanged: z.string().optional(),
    changedByUser: ProviderUserSchema.nullable().optional()
});

const ProviderAttachmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    fileUrl: z.string()
});

const ProviderQuestionSchema = z.object({
    id: z.number(),
    label: z.string()
});

const ProviderAnswerSchema = z.object({
    id: z.number(),
    label: z.string()
});

const ProviderQuestionAndAnswerSchema = z.object({
    question: ProviderQuestionSchema,
    answer: ProviderAnswerSchema,
    hasRevisions: z.boolean().nullable().optional(),
    isArchived: z.boolean().nullable().optional(),
    archivedDate: z.string().nullable().optional(),
    editedDate: z.string().nullable().optional(),
    editedEndDate: z.string().nullable().optional()
});

const ProviderAddressSchema = z.object({
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zipcode: z.string().nullable(),
    country: z.string().nullable()
});

const ProviderEducationLevelSchema = z.object({
    id: z.number(),
    label: z.string()
});

const ProviderEducationSchema = z.object({
    institution: z.string().nullable(),
    level: ProviderEducationLevelSchema.nullable()
});

const ProviderApplicantSchema = z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phoneNumber: z.string().nullable(),
    avatar: z.string().nullable(),
    source: z.string().nullable(),
    twitterUsername: z.string().nullable(),
    address: ProviderAddressSchema.nullable(),
    linkedinUrl: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    availableStartDate: z.string().nullable(),
    education: ProviderEducationSchema.nullable()
});

const ProviderJobTitleDetailSchema = z.object({
    id: z.number().nullable(),
    label: z.string()
});

const ProviderHiringLeadSchema = z.object({
    employeeId: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    avatar: z.string().nullable(),
    jobTitle: ProviderJobTitleSchema.nullable()
});

const ProviderJobSchema = z.object({
    id: z.number(),
    title: ProviderJobTitleDetailSchema,
    hiringLead: ProviderHiringLeadSchema.nullable()
});

const ProviderApplicationSchema = z.object({
    id: z.number(),
    appliedDate: z.string(),
    status: ProviderStatusSchema,
    rating: z.number().nullable(),
    resumeFileId: z.number().nullable(),
    coverLetterFileId: z.number().nullable(),
    attachmentCount: z.number().nullable(),
    attachments: z.array(ProviderAttachmentSchema).nullable(),
    movedTo: z.array(z.object({}).passthrough()).nullable(),
    movedFrom: z.array(z.object({}).passthrough()).nullable(),
    alsoConsideredForCount: z.number(),
    duplicateApplicationCount: z.number(),
    referredBy: z.string().nullable(),
    desiredSalary: z.string().nullable(),
    commentCount: z.number(),
    emailCount: z.number(),
    eventCount: z.number(),
    questionsAndAnswers: z.array(ProviderQuestionAndAnswerSchema),
    applicationReferences: z.string().nullable(),
    applicant: ProviderApplicantSchema,
    job: ProviderJobSchema
});

const OutputSchema = z.object({
    id: z.number(),
    appliedDate: z.string(),
    status: z.object({
        id: z.number(),
        label: z.string(),
        dateChanged: z.string().optional(),
        changedByUser: z
            .object({
                id: z.number(),
                firstName: z.string(),
                lastName: z.string(),
                avatar: z.string().nullable(),
                jobTitle: z
                    .object({
                        id: z.number().nullable(),
                        label: z.string().nullable()
                    })
                    .nullable()
            })
            .nullable()
            .optional()
    }),
    rating: z.number().nullable().optional(),
    resumeFileId: z.number().nullable().optional(),
    coverLetterFileId: z.number().nullable().optional(),
    attachmentCount: z.number().nullable().optional(),
    attachments: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                fileUrl: z.string()
            })
        )
        .nullable()
        .optional(),
    movedTo: z.array(z.object({}).passthrough()).nullable().optional(),
    movedFrom: z.array(z.object({}).passthrough()).nullable().optional(),
    alsoConsideredForCount: z.number().optional(),
    duplicateApplicationCount: z.number().optional(),
    referredBy: z.string().nullable().optional(),
    desiredSalary: z.string().nullable().optional(),
    commentCount: z.number().optional(),
    emailCount: z.number().optional(),
    eventCount: z.number().optional(),
    questionsAndAnswers: z
        .array(
            z.object({
                question: z.object({
                    id: z.number(),
                    label: z.string()
                }),
                answer: z.object({
                    id: z.number(),
                    label: z.string()
                }),
                hasRevisions: z.boolean().nullable().optional(),
                isArchived: z.boolean().nullable().optional(),
                archivedDate: z.string().nullable().optional(),
                editedDate: z.string().nullable().optional(),
                editedEndDate: z.string().nullable().optional()
            })
        )
        .optional(),
    applicationReferences: z.string().nullable().optional(),
    applicant: z.object({
        id: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phoneNumber: z.string().nullable().optional(),
        avatar: z.string().nullable().optional(),
        source: z.string().nullable().optional(),
        twitterUsername: z.string().nullable().optional(),
        address: z
            .object({
                addressLine1: z.string().nullable().optional(),
                addressLine2: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
                state: z.string().nullable().optional(),
                zipcode: z.string().nullable().optional(),
                country: z.string().nullable().optional()
            })
            .nullable()
            .optional(),
        linkedinUrl: z.string().nullable().optional(),
        websiteUrl: z.string().nullable().optional(),
        availableStartDate: z.string().nullable().optional(),
        education: z
            .object({
                institution: z.string().nullable().optional(),
                level: z
                    .object({
                        id: z.number(),
                        label: z.string()
                    })
                    .nullable()
                    .optional()
            })
            .nullable()
            .optional()
    }),
    job: z.object({
        id: z.number(),
        title: z.object({
            id: z.number().nullable(),
            label: z.string()
        }),
        hiringLead: z
            .object({
                employeeId: z.number(),
                firstName: z.string(),
                lastName: z.string(),
                avatar: z.string().nullable().optional(),
                jobTitle: z
                    .object({
                        id: z.number().nullable(),
                        label: z.string().nullable()
                    })
                    .nullable()
                    .optional()
            })
            .nullable()
            .optional()
    })
});

const action = createAction({
    description: 'Retrieve a single applicant from the BambooHR ATS.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-applicant',
        group: 'Applicant Tracking'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hiring:applications'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/get-application-details
            endpoint: `/v1/applicant_tracking/applications/${encodeURIComponent(String(input.applicationId))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Applicant not found',
                application_id: input.applicationId
            });
        }

        const application = ProviderApplicationSchema.parse(response.data);

        return {
            id: application.id,
            appliedDate: application.appliedDate,
            status: {
                id: application.status.id,
                label: application.status.label,
                ...(application.status.dateChanged !== undefined && { dateChanged: application.status.dateChanged }),
                ...(application.status.changedByUser !== undefined && {
                    changedByUser: application.status.changedByUser
                        ? {
                              id: application.status.changedByUser.id,
                              firstName: application.status.changedByUser.firstName,
                              lastName: application.status.changedByUser.lastName,
                              avatar: application.status.changedByUser.avatar,
                              jobTitle: application.status.changedByUser.jobTitle
                          }
                        : null
                })
            },
            ...(application.rating !== undefined && { rating: application.rating }),
            ...(application.resumeFileId !== undefined && { resumeFileId: application.resumeFileId }),
            ...(application.coverLetterFileId !== undefined && { coverLetterFileId: application.coverLetterFileId }),
            ...(application.attachmentCount !== undefined && { attachmentCount: application.attachmentCount }),
            ...(application.attachments !== undefined && { attachments: application.attachments }),
            ...(application.movedTo !== undefined && { movedTo: application.movedTo }),
            ...(application.movedFrom !== undefined && { movedFrom: application.movedFrom }),
            ...(application.alsoConsideredForCount !== undefined && { alsoConsideredForCount: application.alsoConsideredForCount }),
            ...(application.duplicateApplicationCount !== undefined && { duplicateApplicationCount: application.duplicateApplicationCount }),
            ...(application.referredBy !== undefined && { referredBy: application.referredBy }),
            ...(application.desiredSalary !== undefined && { desiredSalary: application.desiredSalary }),
            ...(application.commentCount !== undefined && { commentCount: application.commentCount }),
            ...(application.emailCount !== undefined && { emailCount: application.emailCount }),
            ...(application.eventCount !== undefined && { eventCount: application.eventCount }),
            ...(application.questionsAndAnswers !== undefined && { questionsAndAnswers: application.questionsAndAnswers }),
            ...(application.applicationReferences !== undefined && { applicationReferences: application.applicationReferences }),
            applicant: {
                id: application.applicant.id,
                firstName: application.applicant.firstName,
                lastName: application.applicant.lastName,
                email: application.applicant.email,
                ...(application.applicant.phoneNumber !== null && { phoneNumber: application.applicant.phoneNumber }),
                ...(application.applicant.avatar !== null && { avatar: application.applicant.avatar }),
                ...(application.applicant.source !== null && { source: application.applicant.source }),
                ...(application.applicant.twitterUsername !== null && { twitterUsername: application.applicant.twitterUsername }),
                ...(application.applicant.address !== null && {
                    address: {
                        ...(application.applicant.address.addressLine1 !== null && { addressLine1: application.applicant.address.addressLine1 }),
                        ...(application.applicant.address.addressLine2 !== null && { addressLine2: application.applicant.address.addressLine2 }),
                        ...(application.applicant.address.city !== null && { city: application.applicant.address.city }),
                        ...(application.applicant.address.state !== null && { state: application.applicant.address.state }),
                        ...(application.applicant.address.zipcode !== null && { zipcode: application.applicant.address.zipcode }),
                        ...(application.applicant.address.country !== null && { country: application.applicant.address.country })
                    }
                }),
                ...(application.applicant.linkedinUrl !== null && { linkedinUrl: application.applicant.linkedinUrl }),
                ...(application.applicant.websiteUrl !== null && { websiteUrl: application.applicant.websiteUrl }),
                ...(application.applicant.availableStartDate !== null && { availableStartDate: application.applicant.availableStartDate }),
                ...(application.applicant.education !== null && {
                    education: {
                        ...(application.applicant.education.institution !== null && { institution: application.applicant.education.institution }),
                        ...(application.applicant.education.level !== null && {
                            level: {
                                id: application.applicant.education.level.id,
                                label: application.applicant.education.level.label
                            }
                        })
                    }
                })
            },
            job: {
                id: application.job.id,
                title: {
                    id: application.job.title.id,
                    label: application.job.title.label
                },
                ...(application.job.hiringLead !== null && {
                    hiringLead: {
                        employeeId: application.job.hiringLead.employeeId,
                        firstName: application.job.hiringLead.firstName,
                        lastName: application.job.hiringLead.lastName,
                        ...(application.job.hiringLead.avatar !== null && { avatar: application.job.hiringLead.avatar }),
                        ...(application.job.hiringLead.jobTitle !== null && {
                            jobTitle: {
                                id: application.job.hiringLead.jobTitle.id,
                                label: application.job.hiringLead.jobTitle.label
                            }
                        })
                    }
                })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
