import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        firstname: z.string().optional().describe('First name of the contact. Maps to the Dataverse contact attribute "firstname". Example: "NangoSeed"'),
        lastname: z.string().optional().describe('Last name of the contact. Maps to the Dataverse contact attribute "lastname". Example: "TestContact"'),
        emailaddress1: z
            .string()
            .optional()
            .describe(
                'Primary email address of the contact. Maps to the Dataverse contact attribute "emailaddress1". Example: "nangoseed.testcontact@example.com"'
            ),
        telephone1: z
            .string()
            .optional()
            .describe('Primary business phone number of the contact. Maps to the Dataverse contact attribute "telephone1". Example: "+1-555-0100"'),
        mobilephone: z
            .string()
            .optional()
            .describe('Mobile phone number of the contact. Maps to the Dataverse contact attribute "mobilephone". Example: "+1-555-0101"'),
        jobtitle: z.string().optional().describe('Job title of the contact. Maps to the Dataverse contact attribute "jobtitle". Example: "Purchasing Manager"'),
        description: z.string().optional().describe('Free-form notes about the contact. Maps to the Dataverse contact attribute "description".')
    })
    .describe('Fields of the Dataverse contact to create. All fields are optional; the Dataverse Web API does not require any contact attribute.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier (GUID) of the created contact. Example: "9199050e-2bbc-f111-aaad-7ced8d717fa5"'),
        fullname: z.string().optional().describe('Computed full display name of the contact. Omitted when the contact has no name parts.'),
        firstname: z.string().optional().describe('First name of the created contact. Omitted when not set.'),
        lastname: z.string().optional().describe('Last name of the created contact. Omitted when not set.'),
        emailaddress1: z.string().optional().describe('Primary email address of the created contact. Omitted when not set.'),
        telephone1: z.string().optional().describe('Primary business phone number of the created contact. Omitted when not set.'),
        mobilephone: z.string().optional().describe('Mobile phone number of the created contact. Omitted when not set.'),
        jobtitle: z.string().optional().describe('Job title of the created contact. Omitted when not set.'),
        description: z.string().optional().describe('Free-form notes stored on the created contact. Omitted when not set.'),
        createdon: z.string().describe('ISO 8601 timestamp of when the contact was created. Example: "2026-09-29T17:26:46Z"'),
        modifiedon: z.string().describe('ISO 8601 timestamp of when the contact was last modified. Example: "2026-09-29T17:26:46Z"')
    })
    .describe('The created Dataverse contact, read back from the API after creation.');

const ProviderContactSchema = z.object({
    contactid: z.string(),
    fullname: z.string().nullable(),
    firstname: z.string().nullable(),
    lastname: z.string().nullable(),
    emailaddress1: z.string().nullable(),
    telephone1: z.string().nullable(),
    mobilephone: z.string().nullable(),
    jobtitle: z.string().nullable(),
    description: z.string().nullable(),
    createdon: z.string(),
    modifiedon: z.string()
});

/**
 * @tags: [read, write]
 * @tagReason: Creates a contact via POST (write), then reads back the created record via GET (read) because create returns no body.
 * @pitfalls: No contact fields are required server-side, so invoking with an empty input succeeds and creates a blank contact, and duplicate detection is off by default, so creating the same person twice succeeds and yields two contacts. Dynamics 365 app forms treat last name as required even though the API does not, so contacts created without one must be given a last name when edited in the app.
 */
const action = createAction({
    description: 'Create a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
        const response = await nango.post<unknown>({
            endpoint: '/api/data/v9.2/contacts',
            data: {
                ...(input.firstname !== undefined && { firstname: input.firstname }),
                ...(input.lastname !== undefined && { lastname: input.lastname }),
                ...(input.emailaddress1 !== undefined && { emailaddress1: input.emailaddress1 }),
                ...(input.telephone1 !== undefined && { telephone1: input.telephone1 }),
                ...(input.mobilephone !== undefined && { mobilephone: input.mobilephone }),
                ...(input.jobtitle !== undefined && { jobtitle: input.jobtitle }),
                ...(input.description !== undefined && { description: input.description })
            },
            // Dataverse create has no idempotency key; retrying after a lost response would create a duplicate contact, so retries must stay 0.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        // Create returns 204 No Content; the new record id is only available in the OData-EntityId response header.
        const entityIdHeader = response.headers['odata-entityid'];
        const idMatch = typeof entityIdHeader === 'string' ? /\(([0-9a-fA-F-]{36})\)/.exec(entityIdHeader) : null;
        const contactId = idMatch?.[1];
        if (!contactId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Contact was created but the response did not contain an OData-EntityId header with the new record id.'
            });
        }

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const contactResponse = await nango.get<unknown>({
            endpoint: `/api/data/v9.2/contacts(${encodeURIComponent(contactId)})`,
            params: {
                $select: 'contactid,fullname,firstname,lastname,emailaddress1,telephone1,mobilephone,jobtitle,description,createdon,modifiedon'
            },
            retries: 3
        });

        const contact = ProviderContactSchema.parse(contactResponse.data);

        return {
            id: contact.contactid,
            createdon: contact.createdon,
            modifiedon: contact.modifiedon,
            ...(contact.fullname != null && { fullname: contact.fullname }),
            ...(contact.firstname != null && { firstname: contact.firstname }),
            ...(contact.lastname != null && { lastname: contact.lastname }),
            ...(contact.emailaddress1 != null && { emailaddress1: contact.emailaddress1 }),
            ...(contact.telephone1 != null && { telephone1: contact.telephone1 }),
            ...(contact.mobilephone != null && { mobilephone: contact.mobilephone }),
            ...(contact.jobtitle != null && { jobtitle: contact.jobtitle }),
            ...(contact.description != null && { description: contact.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
