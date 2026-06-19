import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    firstName: z.string().describe('The first name of the candidate. Example: "John"'),
    lastName: z.string().describe('The last name of the candidate. Example: "Doe"'),
    jobId: z.number().describe('The id of the job opening for the candidate application. Example: 22'),
    email: z.string().optional().describe('The email address of the candidate. Must be a valid email address.'),
    phoneNumber: z.string().optional().describe('The phone number of the candidate.'),
    source: z.string().optional().describe('The source of the candidate application, e.g. LinkedIn, Indeed, etc.'),
    address: z.string().optional().describe('The street address of the candidate.'),
    city: z.string().optional().describe('The city of the candidate.'),
    state: z.string().optional().describe('The state or province of the candidate. Accepts state name, abbreviation, or ISO code.'),
    zip: z.string().optional().describe('The zip code or postal code of the candidate.'),
    country: z.string().optional().describe('The country of the candidate. Accepts country name or ISO code.'),
    linkedinUrl: z.string().optional().describe('The LinkedIn profile URL of the candidate.'),
    dateAvailable: z.string().optional().describe('The available start date of the candidate. Format: Y-m-d (e.g. 2024-06-01).'),
    desiredSalary: z.string().optional().describe('The desired salary of the candidate.'),
    referredBy: z.string().optional().describe('The person or entity that referred the candidate.'),
    websiteUrl: z.string().optional().describe('The personal website, blog, or online portfolio of the candidate.'),
    highestEducation: z.string().optional().describe('The highest completed education level of the candidate.'),
    collegeName: z.string().optional().describe('The college or university of the candidate.'),
    references: z.string().optional().describe('A list of references supplied by the candidate.')
});

const ProviderResponseSchema = z.object({
    result: z.string(),
    candidateId: z.number()
});

const OutputSchema = z.object({
    result: z.string(),
    candidateId: z.number()
});

const action = createAction({
    description: 'Create a new candidate application for a job opening in the BambooHR ATS.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hiring:applications.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://documentation.bamboohr.com/reference/create-candidate
            endpoint: '/v1/applicant_tracking/application',
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                jobId: input.jobId,
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
                ...(input.source !== undefined && { source: input.source }),
                ...(input.address !== undefined && { address: input.address }),
                ...(input.city !== undefined && { city: input.city }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.zip !== undefined && { zip: input.zip }),
                ...(input.country !== undefined && { country: input.country }),
                ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
                ...(input.dateAvailable !== undefined && { dateAvailable: input.dateAvailable }),
                ...(input.desiredSalary !== undefined && { desiredSalary: input.desiredSalary }),
                ...(input.referredBy !== undefined && { referredBy: input.referredBy }),
                ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
                ...(input.highestEducation !== undefined && { highestEducation: input.highestEducation }),
                ...(input.collegeName !== undefined && { collegeName: input.collegeName }),
                ...(input.references !== undefined && { references: input.references })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            result: providerResponse.result,
            candidateId: providerResponse.candidateId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
