import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        company_id: z
            .string()
            .min(1)
            .describe('Unique ID of the company to retrieve. Brevo company IDs are 24-character hex strings. Example: "629475917295261d9b1f4403".')
    })
    .describe('Input for retrieving a single Brevo company by ID.');

const CompanyResponseSchema = z.object({
    id: z.string(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    linkedContactsIds: z.array(z.number()).optional(),
    linkedDealsIds: z.array(z.string()).optional(),
    createdBy: z.string().optional(),
    refs: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique company ID (24-character hex string).'),
        attributes: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Company attribute values keyed by attribute name. Standard attributes include name, domain, industry, created_at, last_updated_at, owner, owner_assign_date and number_of_contacts; any custom attributes also appear here.'
            ),
        linkedContactsIds: z.array(z.number()).optional().describe('Numeric IDs of the contacts linked to this company.'),
        linkedDealsIds: z.array(z.string()).optional().describe('IDs of the deals linked to this company (24-character hex strings).'),
        createdBy: z.string().optional().describe('ID of the user who created the company.'),
        refs: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Resolved references for linked resources (e.g. linkedContacts). Values may be null when no linked resources are resolved.')
    })
    .describe('A single Brevo company with its attributes and linked resource IDs.');

/**
 * @tags: [read]
 * @tagReason: Only performs a provider read (GET a single company by ID) and makes no mutations.
 * @pitfalls: Company IDs are 24-character hex strings, not the small numeric IDs Brevo uses for contacts, lists or campaigns — an ID from another resource type will not resolve here.
 */
const action = createAction({
    description: 'Retrieve a single company by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get_companies-id
            endpoint: `/companies/${encodeURIComponent(input.company_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        return CompanyResponseSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
