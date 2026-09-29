import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const updatableContactFields = {
    firstname: z.string().nullable().optional().describe("Contact's first name. Example: 'Kevin'. Set to null to clear the stored value."),
    middlename: z.string().nullable().optional().describe("Contact's middle name. Example: 'James'. Set to null to clear the stored value."),
    lastname: z.string().nullable().optional().describe("Contact's last name. Example: 'Martin'. Set to null to clear the stored value."),
    emailaddress1: z
        .string()
        .nullable()
        .optional()
        .describe("Primary email address. Example: 'kevin.martin@example.com'. Set to null to clear the stored value."),
    telephone1: z.string().nullable().optional().describe("Primary business phone number. Example: '+1-555-0132'. Set to null to clear the stored value."),
    mobilephone: z.string().nullable().optional().describe("Mobile phone number. Example: '+1-555-0188'. Set to null to clear the stored value."),
    jobtitle: z.string().nullable().optional().describe("Job title. Example: 'Sales Manager'. Set to null to clear the stored value."),
    address1_line1: z.string().nullable().optional().describe("Primary address street line 1. Example: '123 Main St'. Set to null to clear the stored value."),
    address1_line2: z.string().nullable().optional().describe("Primary address street line 2. Example: 'Suite 400'. Set to null to clear the stored value."),
    address1_city: z.string().nullable().optional().describe("Primary address city. Example: 'Redmond'. Set to null to clear the stored value."),
    address1_stateorprovince: z
        .string()
        .nullable()
        .optional()
        .describe("Primary address state or province. Example: 'WA'. Set to null to clear the stored value."),
    address1_postalcode: z.string().nullable().optional().describe("Primary address postal code. Example: '98052'. Set to null to clear the stored value."),
    address1_country: z
        .string()
        .nullable()
        .optional()
        .describe("Primary address country or region. Example: 'United States'. Set to null to clear the stored value."),
    birthdate: z.string().nullable().optional().describe("Date of birth in 'yyyy-MM-dd' format. Example: '1985-04-12'. Set to null to clear the stored value."),
    description: z.string().nullable().optional().describe('Free-text notes about the contact. Set to null to clear the stored value.')
};

const InputSchema = z
    .object({
        contactid: z.string().describe("GUID of the contact to update. Example: '975419ff-2abc-f111-aaad-7ced8d717fa5'"),
        ...updatableContactFields
    })
    .describe(
        "Fields to update on a Dataverse contact. Only 'contactid' is required; every other provided field is partially merged into the existing record."
    );

const OutputSchema = z
    .object({
        contactid: z.string().describe('GUID of the updated contact.'),
        fullname: z.string().nullable().optional().describe('Computed full name of the contact, or null if no name fields are set.'),
        firstname: z.string().nullable().optional().describe("Contact's first name, or null when unset."),
        middlename: z.string().nullable().optional().describe("Contact's middle name, or null when unset."),
        lastname: z.string().nullable().optional().describe("Contact's last name, or null when unset."),
        emailaddress1: z.string().nullable().optional().describe('Primary email address, or null when unset.'),
        telephone1: z.string().nullable().optional().describe('Primary business phone number, or null when unset.'),
        mobilephone: z.string().nullable().optional().describe('Mobile phone number, or null when unset.'),
        jobtitle: z.string().nullable().optional().describe('Job title, or null when unset.'),
        address1_line1: z.string().nullable().optional().describe('Primary address street line 1, or null when unset.'),
        address1_line2: z.string().nullable().optional().describe('Primary address street line 2, or null when unset.'),
        address1_city: z.string().nullable().optional().describe('Primary address city, or null when unset.'),
        address1_stateorprovince: z.string().nullable().optional().describe('Primary address state or province, or null when unset.'),
        address1_postalcode: z.string().nullable().optional().describe('Primary address postal code, or null when unset.'),
        address1_country: z.string().nullable().optional().describe('Primary address country or region, or null when unset.'),
        birthdate: z.string().nullable().optional().describe("Date of birth in 'yyyy-MM-dd' format, or null when unset."),
        description: z.string().nullable().optional().describe('Free-text notes about the contact, or null when unset.'),
        modifiedon: z.string().nullable().optional().describe("ISO 8601 timestamp of the contact's last modification. Example: '2026-09-29T17:27:12Z'")
    })
    .describe('The updated Dataverse contact record, read back after the update.');

/**
 * @tags: [read, write]
 * @tagReason: Partially updates contact fields via PATCH (write), then reads the updated record back via GET (read) because Dataverse returns an empty 204 response to updates.
 * @pitfalls: Passing null for a field clears its value server-side; omit fields you do not intend to change. Lookup fields such as parentcustomerid cannot be set with plain values and require a relationship association instead.
 */
const action = createAction({
    description: "Update a contact's fields (partial merge: only provided fields are changed)",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, string | null> = {
            ...(input.firstname !== undefined && { firstname: input.firstname }),
            ...(input.middlename !== undefined && { middlename: input.middlename }),
            ...(input.lastname !== undefined && { lastname: input.lastname }),
            ...(input.emailaddress1 !== undefined && { emailaddress1: input.emailaddress1 }),
            ...(input.telephone1 !== undefined && { telephone1: input.telephone1 }),
            ...(input.mobilephone !== undefined && { mobilephone: input.mobilephone }),
            ...(input.jobtitle !== undefined && { jobtitle: input.jobtitle }),
            ...(input.address1_line1 !== undefined && { address1_line1: input.address1_line1 }),
            ...(input.address1_line2 !== undefined && { address1_line2: input.address1_line2 }),
            ...(input.address1_city !== undefined && { address1_city: input.address1_city }),
            ...(input.address1_stateorprovince !== undefined && { address1_stateorprovince: input.address1_stateorprovince }),
            ...(input.address1_postalcode !== undefined && { address1_postalcode: input.address1_postalcode }),
            ...(input.address1_country !== undefined && { address1_country: input.address1_country }),
            ...(input.birthdate !== undefined && { birthdate: input.birthdate }),
            ...(input.description !== undefined && { description: input.description })
        };

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields_to_update',
                message: "Provide at least one field besides 'contactid' to update."
            });
        }

        const updateConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api#basic-update
            endpoint: `/api/data/v9.2/contacts(${encodeURIComponent(input.contactid)})`,
            data,
            // No idempotency key exists; a retry after a lost response would re-fire server-side plugins and workflows, duplicating their side effects.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        await nango.patch(updateConfig);

        // The PATCH above returns 204 with no body, so the updated record is read back with a separate GET.
        const readConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api#basic-retrieve
            endpoint: `/api/data/v9.2/contacts(${encodeURIComponent(input.contactid)})`,
            params: {
                $select:
                    'contactid,fullname,firstname,middlename,lastname,emailaddress1,telephone1,mobilephone,jobtitle,address1_line1,address1_line2,address1_city,address1_stateorprovince,address1_postalcode,address1_country,birthdate,description,modifiedon'
            },
            retries: 3
        };
        const response = await nango.get(readConfig);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
