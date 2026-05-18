import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().optional().describe('The email address of the person. Example: "alice@nango-test.io"'),
    id: z.string().optional().describe('The Apollo ID for the person. Example: "587cf802f65125cad923a266"'),
    first_name: z.string().optional().describe('The first name of the person. Example: "Tim"'),
    last_name: z.string().optional().describe('The last name of the person. Example: "Zheng"'),
    name: z.string().optional().describe('The full name of the person. Example: "Tim Zheng"'),
    domain: z.string().optional().describe('The domain name for the person\'s employer. Example: "apollo.io"'),
    organization_name: z.string().optional().describe('The name of the person\'s employer. Example: "Apollo"'),
    linkedin_url: z.string().optional().describe('The URL for the person\'s LinkedIn profile. Example: "http://www.linkedin.com/in/tim-zheng-677ba010"'),
    hashed_email: z.string().optional().describe('The hashed email of the person (MD5 or SHA-256).'),
    reveal_personal_emails: z.boolean().optional().describe('Set to true to reveal personal emails.'),
    reveal_phone_number: z.boolean().optional().describe('Set to true to reveal phone numbers.'),
    webhook_url: z.string().optional().describe('Webhook URL for phone number delivery (required if reveal_phone_number is true).'),
    run_waterfall_email: z.boolean().optional().describe('Set to true to enable email waterfall enrichment.'),
    run_waterfall_phone: z.boolean().optional().describe('Set to true to enable phone waterfall enrichment.')
});

const EmploymentSchema = z.object({
    id: z.string().optional(),
    organization_id: z.string().optional(),
    organization_name: z.string().optional(),
    organization_website_url: z.string().optional(),
    title: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().nullable().optional(),
    current: z.boolean().optional()
});

const EmailSchema = z.object({
    email: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional()
});

const PhoneSchema = z.object({
    number: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional()
});

const ProviderPersonSchema = z.object({
    id: z.string().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    organization_id: z.string().nullable().optional(),
    organization_name: z.string().nullable().optional(),
    organization_website_url: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    linkedin_url: z.string().nullable().optional(),
    twitter_url: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    employment_history: z.array(EmploymentSchema).nullable().optional(),
    email_status: z.string().nullable().optional(),
    email_true_status: z.string().nullable().optional(),
    emails: z.array(EmailSchema).nullable().optional(),
    phone_numbers: z.array(PhoneSchema).nullable().optional(),
    is_likely_to_respond: z.boolean().nullable().optional(),
    departments: z.array(z.string()).nullable().optional(),
    subdepartments: z.array(z.string()).nullable().optional(),
    functions: z.array(z.string()).nullable().optional(),
    seniority: z.string().nullable().optional(),
    photo_url: z.string().nullable().optional(),
    tenure_in_months: z.number().nullable().optional()
});

const ProviderResponseSchema = z.object({
    person: ProviderPersonSchema.nullable().optional()
});

const EmploymentOutputSchema = z.object({
    id: z.string().optional(),
    organizationId: z.string().optional(),
    organizationName: z.string().optional(),
    organizationWebsiteUrl: z.string().optional(),
    title: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    current: z.boolean().optional()
});

const EmailOutputSchema = z.object({
    email: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional()
});

const PhoneOutputSchema = z.object({
    number: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    organizationId: z.string().optional(),
    organizationName: z.string().optional(),
    organizationWebsiteUrl: z.string().optional(),
    title: z.string().optional(),
    linkedinUrl: z.string().optional(),
    twitterUrl: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    employmentHistory: z.array(EmploymentOutputSchema).optional(),
    emailStatus: z.string().optional(),
    emailTrueStatus: z.string().optional(),
    emails: z.array(EmailOutputSchema).optional(),
    phoneNumbers: z.array(PhoneOutputSchema).optional(),
    isLikelyToRespond: z.boolean().optional(),
    departments: z.array(z.string()).optional(),
    subdepartments: z.array(z.string()).optional(),
    functions: z.array(z.string()).optional(),
    seniority: z.string().optional(),
    photoUrl: z.string().optional(),
    tenureInMonths: z.number().optional()
});

const action = createAction({
    description: 'Enrich a person by email or Apollo ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/enrich-person',
        group: 'People'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Validate that at least one identifying parameter is provided
        if (!input.email && !input.id && !input.name && !input.linkedin_url) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one identifying parameter (email, id, name, or linkedin_url) is required to enrich a person.'
            });
        }

        // https://docs.apollo.io/reference/people-enrichment
        const response = await nango.post({
            endpoint: '/v1/people/match',
            params: {
                ...(input.email !== undefined && { email: input.email }),
                ...(input.id !== undefined && { id: input.id }),
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.domain !== undefined && { domain: input.domain }),
                ...(input.organization_name !== undefined && { organization_name: input.organization_name }),
                ...(input.linkedin_url !== undefined && { linkedin_url: input.linkedin_url }),
                ...(input.hashed_email !== undefined && { hashed_email: input.hashed_email }),
                ...(input.reveal_personal_emails !== undefined && { reveal_personal_emails: String(input.reveal_personal_emails) }),
                ...(input.reveal_phone_number !== undefined && { reveal_phone_number: String(input.reveal_phone_number) }),
                ...(input.webhook_url !== undefined && { webhook_url: input.webhook_url }),
                ...(input.run_waterfall_email !== undefined && { run_waterfall_email: String(input.run_waterfall_email) }),
                ...(input.run_waterfall_phone !== undefined && { run_waterfall_phone: String(input.run_waterfall_phone) })
            },
            retries: 3
        });

        const responseData = ProviderResponseSchema.parse(response.data);

        if (!responseData.person) {
            return {};
        }

        const person = responseData.person;

        return {
            ...(person.id != null && { id: person.id }),
            ...(person.first_name != null && { firstName: person.first_name }),
            ...(person.last_name != null && { lastName: person.last_name }),
            ...(person.name != null && { name: person.name }),
            ...(person.email != null && { email: person.email }),
            ...(person.organization_id != null && { organizationId: person.organization_id }),
            ...(person.organization_name != null && { organizationName: person.organization_name }),
            ...(person.organization_website_url != null && { organizationWebsiteUrl: person.organization_website_url }),
            ...(person.title != null && { title: person.title }),
            ...(person.linkedin_url != null && { linkedinUrl: person.linkedin_url }),
            ...(person.twitter_url != null && { twitterUrl: person.twitter_url }),
            ...(person.country != null && { country: person.country }),
            ...(person.state != null && { state: person.state }),
            ...(person.city != null && { city: person.city }),
            ...(person.employment_history != null && {
                employmentHistory: person.employment_history.map((emp) => ({
                    ...(emp.id != null && { id: emp.id }),
                    ...(emp.organization_id != null && { organizationId: emp.organization_id }),
                    ...(emp.organization_name != null && { organizationName: emp.organization_name }),
                    ...(emp.organization_website_url != null && { organizationWebsiteUrl: emp.organization_website_url }),
                    ...(emp.title != null && { title: emp.title }),
                    ...(emp.start_date != null && { startDate: emp.start_date }),
                    ...(emp.end_date != null && { endDate: emp.end_date }),
                    ...(emp.current != null && { current: emp.current })
                }))
            }),
            ...(person.email_status != null && { emailStatus: person.email_status }),
            ...(person.email_true_status != null && { emailTrueStatus: person.email_true_status }),
            ...(person.emails != null && { emails: person.emails.map((e) => ({ email: e.email, type: e.type, status: e.status })) }),
            ...(person.phone_numbers != null && {
                phoneNumbers: person.phone_numbers.map((p) => ({ number: p.number, type: p.type, status: p.status }))
            }),
            ...(person.is_likely_to_respond != null && { isLikelyToRespond: person.is_likely_to_respond }),
            ...(person.departments != null && { departments: person.departments }),
            ...(person.subdepartments != null && { subdepartments: person.subdepartments }),
            ...(person.functions != null && { functions: person.functions }),
            ...(person.seniority != null && { seniority: person.seniority }),
            ...(person.photo_url != null && { photoUrl: person.photo_url }),
            ...(person.tenure_in_months != null && { tenureInMonths: person.tenure_in_months })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
