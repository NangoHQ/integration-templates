import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        leadid: z.string().describe('Unique identifier (GUID) of the lead to update. Example: "3f2504e0-4f89-11d3-9a0c-0305e82c3301".'),
        subject: z.string().nullable().optional().describe('New topic (short summary) of the lead. Set to null to clear the current value.'),
        salutation: z
            .string()
            .nullable()
            .optional()
            .describe('New salutation for the lead contact, for example "Ms.". Set to null to clear the current value.'),
        firstname: z.string().nullable().optional().describe('New first name of the lead contact. Set to null to clear the current value.'),
        middlename: z.string().nullable().optional().describe('New middle name of the lead contact. Set to null to clear the current value.'),
        lastname: z.string().nullable().optional().describe('New last name of the lead contact. Set to null to clear the current value.'),
        jobtitle: z.string().nullable().optional().describe('New job title of the lead contact. Set to null to clear the current value.'),
        companyname: z.string().nullable().optional().describe('New company or account name associated with the lead. Set to null to clear the current value.'),
        emailaddress1: z.string().nullable().optional().describe('New primary email address of the lead. Set to null to clear the current value.'),
        telephone1: z.string().nullable().optional().describe('New primary phone number of the lead. Set to null to clear the current value.'),
        mobilephone: z.string().nullable().optional().describe('New mobile phone number of the lead contact. Set to null to clear the current value.'),
        fax: z.string().nullable().optional().describe('New fax number of the lead. Set to null to clear the current value.'),
        websiteurl: z.string().nullable().optional().describe('New website URL associated with the lead. Set to null to clear the current value.'),
        description: z.string().nullable().optional().describe('New free-form notes describing the lead. Set to null to clear the current value.'),
        address1_line1: z.string().nullable().optional().describe('New first street address line of the lead. Set to null to clear the current value.'),
        address1_line2: z.string().nullable().optional().describe('New second street address line of the lead. Set to null to clear the current value.'),
        address1_line3: z.string().nullable().optional().describe('New third street address line of the lead. Set to null to clear the current value.'),
        address1_city: z.string().nullable().optional().describe('New city of the lead address. Set to null to clear the current value.'),
        address1_stateorprovince: z
            .string()
            .nullable()
            .optional()
            .describe('New state or province of the lead address. Set to null to clear the current value.'),
        address1_postalcode: z.string().nullable().optional().describe('New postal code of the lead address. Set to null to clear the current value.'),
        address1_country: z.string().nullable().optional().describe('New country or region of the lead address. Set to null to clear the current value.'),
        leadqualitycode: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('New option set value for the lead quality rating. Set to null to clear the current value.'),
        leadsourcecode: z.number().int().nullable().optional().describe('New option set value for the lead source. Set to null to clear the current value.'),
        industrycode: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('New option set value for the industry of the lead. Set to null to clear the current value.'),
        preferredcontactmethodcode: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('New option set value for the preferred contact method of the lead. Set to null to clear the current value.'),
        numberofemployees: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('New number of employees at the company of the lead. Set to null to clear the current value.'),
        revenue: z
            .number()
            .nullable()
            .optional()
            .describe('New estimated annual revenue of the company of the lead as a decimal number. Set to null to clear the current value.'),
        budgetamount: z
            .number()
            .nullable()
            .optional()
            .describe('New estimated budget of the lead as a decimal number. Set to null to clear the current value.'),
        donotemail: z
            .boolean()
            .nullable()
            .optional()
            .describe('Set to true to opt the lead out of email, or false to opt back in. Set to null to clear the current value.'),
        donotphone: z
            .boolean()
            .nullable()
            .optional()
            .describe('Set to true to opt the lead out of phone calls, or false to opt back in. Set to null to clear the current value.'),
        donotfax: z
            .boolean()
            .nullable()
            .optional()
            .describe('Set to true to opt the lead out of faxes, or false to opt back in. Set to null to clear the current value.'),
        donotbulkemail: z
            .boolean()
            .nullable()
            .optional()
            .describe('Set to true to opt the lead out of bulk email, or false to opt back in. Set to null to clear the current value.'),
        confirminterest: z.boolean().nullable().optional().describe('Set whether the lead has confirmed interest. Set to null to clear the current value.'),
        evaluatefit: z.boolean().nullable().optional().describe('Set whether the lead has been evaluated as a fit. Set to null to clear the current value.'),
        decisionmaker: z.boolean().nullable().optional().describe('Set whether the lead contact is a decision maker. Set to null to clear the current value.')
    })
    .describe(
        'Fields to update on an existing Dataverse lead. leadid identifies the record; every other field is optional and only the fields provided are changed.'
    );

const ProviderLeadSchema = z.object({
    leadid: z.string(),
    subject: z.string().nullable().optional(),
    salutation: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    middlename: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    jobtitle: z.string().nullable().optional(),
    companyname: z.string().nullable().optional(),
    emailaddress1: z.string().nullable().optional(),
    telephone1: z.string().nullable().optional(),
    mobilephone: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    websiteurl: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    address1_line1: z.string().nullable().optional(),
    address1_line2: z.string().nullable().optional(),
    address1_line3: z.string().nullable().optional(),
    address1_city: z.string().nullable().optional(),
    address1_stateorprovince: z.string().nullable().optional(),
    address1_postalcode: z.string().nullable().optional(),
    address1_country: z.string().nullable().optional(),
    leadqualitycode: z.number().nullable().optional(),
    leadsourcecode: z.number().nullable().optional(),
    industrycode: z.number().nullable().optional(),
    preferredcontactmethodcode: z.number().nullable().optional(),
    numberofemployees: z.number().nullable().optional(),
    revenue: z.number().nullable().optional(),
    budgetamount: z.number().nullable().optional(),
    donotemail: z.boolean().nullable().optional(),
    donotphone: z.boolean().nullable().optional(),
    donotfax: z.boolean().nullable().optional(),
    donotbulkemail: z.boolean().nullable().optional(),
    confirminterest: z.boolean().nullable().optional(),
    evaluatefit: z.boolean().nullable().optional(),
    decisionmaker: z.boolean().nullable().optional(),
    statecode: z.number().nullable().optional(),
    statuscode: z.number().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        leadid: z.string().describe('Unique identifier (GUID) of the updated lead.'),
        subject: z.string().optional().describe('Topic of the lead after the update. Omitted when the field has no value.'),
        salutation: z.string().optional().describe('Salutation of the lead contact after the update. Omitted when the field has no value.'),
        firstname: z.string().optional().describe('First name of the lead contact after the update. Omitted when the field has no value.'),
        middlename: z.string().optional().describe('Middle name of the lead contact after the update. Omitted when the field has no value.'),
        lastname: z.string().optional().describe('Last name of the lead contact after the update. Omitted when the field has no value.'),
        jobtitle: z.string().optional().describe('Job title of the lead contact after the update. Omitted when the field has no value.'),
        companyname: z.string().optional().describe('Company or account name of the lead after the update. Omitted when the field has no value.'),
        emailaddress1: z.string().optional().describe('Primary email address of the lead after the update. Omitted when the field has no value.'),
        telephone1: z.string().optional().describe('Primary phone number of the lead after the update. Omitted when the field has no value.'),
        mobilephone: z.string().optional().describe('Mobile phone number of the lead contact after the update. Omitted when the field has no value.'),
        fax: z.string().optional().describe('Fax number of the lead after the update. Omitted when the field has no value.'),
        websiteurl: z.string().optional().describe('Website URL of the lead after the update. Omitted when the field has no value.'),
        description: z.string().optional().describe('Free-form notes of the lead after the update. Omitted when the field has no value.'),
        address1_line1: z.string().optional().describe('First street address line of the lead after the update. Omitted when the field has no value.'),
        address1_line2: z.string().optional().describe('Second street address line of the lead after the update. Omitted when the field has no value.'),
        address1_line3: z.string().optional().describe('Third street address line of the lead after the update. Omitted when the field has no value.'),
        address1_city: z.string().optional().describe('City of the lead address after the update. Omitted when the field has no value.'),
        address1_stateorprovince: z
            .string()
            .optional()
            .describe('State or province of the lead address after the update. Omitted when the field has no value.'),
        address1_postalcode: z.string().optional().describe('Postal code of the lead address after the update. Omitted when the field has no value.'),
        address1_country: z.string().optional().describe('Country or region of the lead address after the update. Omitted when the field has no value.'),
        leadqualitycode: z
            .number()
            .int()
            .optional()
            .describe('Option set value of the lead quality rating after the update. Omitted when the field has no value.'),
        leadsourcecode: z.number().int().optional().describe('Option set value of the lead source after the update. Omitted when the field has no value.'),
        industrycode: z.number().int().optional().describe('Option set value of the lead industry after the update. Omitted when the field has no value.'),
        preferredcontactmethodcode: z
            .number()
            .int()
            .optional()
            .describe('Option set value of the preferred contact method after the update. Omitted when the field has no value.'),
        numberofemployees: z
            .number()
            .int()
            .optional()
            .describe('Number of employees at the company of the lead after the update. Omitted when the field has no value.'),
        revenue: z.number().optional().describe('Estimated annual revenue of the company of the lead after the update. Omitted when the field has no value.'),
        budgetamount: z.number().optional().describe('Estimated budget of the lead after the update. Omitted when the field has no value.'),
        donotemail: z.boolean().optional().describe('Whether the lead is opted out of email after the update. Omitted when the field has no value.'),
        donotphone: z.boolean().optional().describe('Whether the lead is opted out of phone calls after the update. Omitted when the field has no value.'),
        donotfax: z.boolean().optional().describe('Whether the lead is opted out of faxes after the update. Omitted when the field has no value.'),
        donotbulkemail: z.boolean().optional().describe('Whether the lead is opted out of bulk email after the update. Omitted when the field has no value.'),
        confirminterest: z.boolean().optional().describe('Whether the lead has confirmed interest after the update. Omitted when the field has no value.'),
        evaluatefit: z.boolean().optional().describe('Whether the lead has been evaluated as a fit after the update. Omitted when the field has no value.'),
        decisionmaker: z.boolean().optional().describe('Whether the lead contact is a decision maker after the update. Omitted when the field has no value.'),
        statecode: z.number().int().optional().describe('Status of the lead after the update: 0 = Open, 1 = Qualified, 2 = Disqualified.'),
        statuscode: z.number().int().optional().describe('Detailed status reason of the lead after the update (option set value).'),
        createdon: z.string().optional().describe('ISO 8601 UTC timestamp when the lead was created.'),
        modifiedon: z.string().optional().describe('ISO 8601 UTC timestamp when the lead was last modified, including by this update.')
    })
    .describe('The lead record after the update, read back from Dataverse. Fields without a value are omitted.');

const LEAD_READ_FIELDS = [
    'leadid',
    'subject',
    'salutation',
    'firstname',
    'middlename',
    'lastname',
    'jobtitle',
    'companyname',
    'emailaddress1',
    'telephone1',
    'mobilephone',
    'fax',
    'websiteurl',
    'description',
    'address1_line1',
    'address1_line2',
    'address1_line3',
    'address1_city',
    'address1_stateorprovince',
    'address1_postalcode',
    'address1_country',
    'leadqualitycode',
    'leadsourcecode',
    'industrycode',
    'preferredcontactmethodcode',
    'numberofemployees',
    'revenue',
    'budgetamount',
    'donotemail',
    'donotphone',
    'donotfax',
    'donotbulkemail',
    'confirminterest',
    'evaluatefit',
    'decisionmaker',
    'statecode',
    'statuscode',
    'createdon',
    'modifiedon'
];

/**
 * @tags: [read, write]
 * @tagReason: Updates the lead's fields with a PATCH (write) and reads the updated record back with a GET (read).
 * @pitfalls: Only the fields provided are changed: omitted fields keep their current values, and passing null clears that field's value. At least one field besides leadid is required; calling with only leadid fails. Lookup and lifecycle fields such as the parent account, owner, or qualification status cannot be changed with this action.
 */
const action = createAction({
    description: "Update a lead's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { leadid: _leadid, ...updatableFields } = input;
        const payload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updatableFields)) {
            if (value !== undefined) {
                payload[key] = value;
            }
        }

        if (Object.keys(payload).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one lead field besides leadid to update.'
            });
        }

        const leadPath = `/api/data/v9.2/leads(${encodeURIComponent(input.leadid)})`;

        const updateConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-entity-web-api
            endpoint: leadPath,
            data: payload,
            // No idempotency key exists; a retry after a lost response would re-fire server-side plugins and workflows, duplicating their side effects.
            retries: 10
        };
        await nango.patch(updateConfig);

        const readConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: leadPath,
            params: {
                $select: LEAD_READ_FIELDS.join(',')
            },
            retries: 3
        };
        const response = await nango.get(readConfig);

        const lead = ProviderLeadSchema.parse(response.data);

        const normalized: Record<string, string | number | boolean> = {};
        for (const [key, value] of Object.entries(lead)) {
            if (value !== null && value !== undefined) {
                normalized[key] = value;
            }
        }

        return OutputSchema.parse(normalized);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
