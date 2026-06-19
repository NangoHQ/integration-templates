import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    jobPostingId: z.string().describe('The id of the job posting to return. Example: "4be0e8c0-9323-43a0-ab48-506789ab9c16"'),
    jobBoardId: z.string().optional().describe('If provided, returns the job posting data for the specified job board.'),
    expand: z.array(z.string()).optional().describe('Choose to expand the result and include additional data for related objects. Example: ["job"]')
});

const DescriptionPartSchema = z.object({
    html: z.string().nullable().optional(),
    plain: z.string().nullable().optional()
});

const ProviderJobPostingSchema = z.object({
    id: z.string(),
    title: z.string(),
    descriptionPlain: z.string(),
    descriptionHtml: z.string(),
    descriptionSocial: z.string().optional(),
    descriptionParts: z
        .object({
            descriptionOpening: DescriptionPartSchema.nullable().optional(),
            descriptionBody: DescriptionPartSchema,
            descriptionClosing: DescriptionPartSchema.nullable().optional()
        })
        .passthrough(),
    departmentName: z.string(),
    teamName: z.string(),
    teamNameHierarchy: z.array(z.string()).optional(),
    jobId: z.string(),
    locationName: z.string(),
    locationIds: z.unknown(),
    linkedData: z.record(z.string(), z.unknown()),
    publishedDate: z.string(),
    applicationDeadline: z.string().nullable().optional(),
    address: z.record(z.string(), z.unknown()).optional(),
    isRemote: z.boolean().optional(),
    workplaceType: z.string().optional(),
    employmentType: z.string(),
    applicationFormDefinition: z.record(z.string(), z.unknown()),
    surveyFormDefinitions: z.array(z.record(z.string(), z.unknown())),
    isListed: z.boolean(),
    suppressDescriptionOpening: z.boolean().optional(),
    suppressDescriptionClosing: z.boolean().optional(),
    externalLink: z.string().nullable().optional(),
    applyLink: z.string(),
    compensation: z.record(z.string(), z.unknown()).optional(),
    updatedAt: z.string(),
    applicationLimitCalloutHtml: z.string().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    results: ProviderJobPostingSchema.optional(),
    errors: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    descriptionPlain: z.string(),
    descriptionHtml: z.string(),
    descriptionSocial: z.string().optional(),
    descriptionParts: z
        .object({
            descriptionOpening: DescriptionPartSchema.nullable().optional(),
            descriptionBody: DescriptionPartSchema,
            descriptionClosing: DescriptionPartSchema.nullable().optional()
        })
        .passthrough(),
    departmentName: z.string(),
    teamName: z.string(),
    teamNameHierarchy: z.array(z.string()).optional(),
    jobId: z.string(),
    locationName: z.string(),
    locationIds: z.unknown(),
    linkedData: z.record(z.string(), z.unknown()),
    publishedDate: z.string(),
    applicationDeadline: z.string().nullable().optional(),
    address: z.record(z.string(), z.unknown()).optional(),
    isRemote: z.boolean().optional(),
    workplaceType: z.string().optional(),
    employmentType: z.string(),
    applicationFormDefinition: z.record(z.string(), z.unknown()),
    surveyFormDefinitions: z.array(z.record(z.string(), z.unknown())),
    isListed: z.boolean(),
    suppressDescriptionOpening: z.boolean().optional(),
    suppressDescriptionClosing: z.boolean().optional(),
    externalLink: z.string().nullable().optional(),
    applyLink: z.string(),
    compensation: z.record(z.string(), z.unknown()).optional(),
    updatedAt: z.string(),
    applicationLimitCalloutHtml: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single job posting from Ashby.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['jobs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/jobpostinginfo
            endpoint: 'jobPosting.info',
            data: {
                jobPostingId: input.jobPostingId,
                ...(input.jobBoardId !== undefined && { jobBoardId: input.jobBoardId }),
                ...(input.expand !== undefined && { expand: input.expand })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response from Ashby API'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.success || !parsed.results) {
            const errorMessages = parsed.errors ? parsed.errors.join('; ') : 'Ashby API returned an unsuccessful response';
            throw new nango.ActionError({
                type: 'provider_error',
                message: errorMessages
            });
        }

        const posting = parsed.results;

        return {
            id: posting.id,
            title: posting.title,
            descriptionPlain: posting.descriptionPlain,
            descriptionHtml: posting.descriptionHtml,
            ...(posting.descriptionSocial !== undefined && { descriptionSocial: posting.descriptionSocial }),
            descriptionParts: posting.descriptionParts,
            departmentName: posting.departmentName,
            teamName: posting.teamName,
            ...(posting.teamNameHierarchy !== undefined && { teamNameHierarchy: posting.teamNameHierarchy }),
            jobId: posting.jobId,
            locationName: posting.locationName,
            locationIds: posting.locationIds,
            linkedData: posting.linkedData,
            publishedDate: posting.publishedDate,
            ...(posting.applicationDeadline !== undefined && { applicationDeadline: posting.applicationDeadline }),
            ...(posting.address !== undefined && { address: posting.address }),
            ...(posting.isRemote !== undefined && { isRemote: posting.isRemote }),
            ...(posting.workplaceType !== undefined && { workplaceType: posting.workplaceType }),
            employmentType: posting.employmentType,
            applicationFormDefinition: posting.applicationFormDefinition,
            surveyFormDefinitions: posting.surveyFormDefinitions,
            isListed: posting.isListed,
            ...(posting.suppressDescriptionOpening !== undefined && { suppressDescriptionOpening: posting.suppressDescriptionOpening }),
            ...(posting.suppressDescriptionClosing !== undefined && { suppressDescriptionClosing: posting.suppressDescriptionClosing }),
            ...(posting.externalLink !== undefined && { externalLink: posting.externalLink }),
            applyLink: posting.applyLink,
            ...(posting.compensation !== undefined && { compensation: posting.compensation }),
            updatedAt: posting.updatedAt,
            ...(posting.applicationLimitCalloutHtml !== undefined && { applicationLimitCalloutHtml: posting.applicationLimitCalloutHtml })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
