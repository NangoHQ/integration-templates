import { z } from 'zod';
import { createAction } from 'nango';

const CompanyAttributesSchema = z
    .object({
        website: z.string().optional().describe('Website URL of the company. Example: "https://acme.com"'),
        linkedin: z.string().optional().describe('LinkedIn page URL of the company. Example: "https://www.linkedin.com/company/acme"'),
        industry: z.string().optional().describe('Industry of the company. Example: "Software"'),
        number_of_employees: z.number().optional().describe('Number of employees at the company. Example: 50'),
        revenue: z.number().optional().describe('Annual revenue of the company. Example: 1000000'),
        phone_number: z
            .string()
            .optional()
            .describe(
                'Phone number of the company. The API expects countryCode to be set at the top level when a phone number is passed. Example: "+14155552671"'
            ),
        owner: z.string().optional().describe('ID of the Brevo account user to assign as the company owner. Example: "61a5cd07ca1347c82306ad06"'),
        domain: z.string().optional().describe('Domain of the company. Example: "acme.com"')
    })
    .passthrough();

const InputSchema = z
    .object({
        name: z.string().describe('Name of the company. Example: "Acme Inc."'),
        attributes: CompanyAttributesSchema.optional().describe(
            'Additional attributes of the company, keyed by the internal attribute names from the Brevo company attributes schema. The listed fields are documented standard attributes; account-defined custom attribute keys are also passed through as-is. All fields are optional.'
        ),
        countryCode: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Country dialing code. The API expects it when attributes.phone_number is set. Example: 1'),
        linkedContactsIds: z.array(z.number().int()).optional().describe('IDs of existing contacts to link to the company. Example: [1, 2]'),
        linkedDealsIds: z
            .array(z.string())
            .optional()
            .describe('IDs of existing deals to link to the company (24-character hex strings). Example: ["61a5cd07ca1347c82306ad06"]')
    })
    .describe('Input for creating a Brevo CRM company.');

const CreateCompanyResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique id of the created company (24-character hex string). Example: "61a5cd07ca1347c82306ad06"')
    })
    .describe('Result of creating a Brevo CRM company.');

/**
 * @tags: [write]
 * @tagReason: Creates a new company record in the provider with a single POST and reads nothing.
 * @pitfalls: Returns only the new company id, so a follow-up request is needed to read the full record. The provider allows duplicate company names, so repeated calls with the same name create separate companies. Send countryCode whenever attributes.phone_number is set.
 */
const action = createAction({
    description: 'Create a new company (CRM object).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.brevo.com/reference/create-a-company
            endpoint: '/companies',
            data: {
                name: input.name,
                ...(input.attributes !== undefined && { attributes: input.attributes }),
                ...(input.countryCode !== undefined && { countryCode: input.countryCode }),
                ...(input.linkedContactsIds !== undefined && { linkedContactsIds: input.linkedContactsIds }),
                ...(input.linkedDealsIds !== undefined && { linkedDealsIds: input.linkedDealsIds })
            },
            // Non-idempotent create: retrying after a lost response would create a duplicate company.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const company = CreateCompanyResponseSchema.parse(response.data);

        return { id: company.id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
