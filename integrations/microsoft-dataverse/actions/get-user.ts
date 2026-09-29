import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        systemuserid: z.string().describe('GUID of the system user (systemuserid) to retrieve. Example: "00000000-0000-0000-0000-000000000000"'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'OData $select attribute names to return, e.g. ["fullname", "internalemailaddress"], including custom user fields. When omitted, the full record is fetched and every curated output field is populated. Attributes beyond the curated output fields are passed through unchanged.'
            )
    })
    .describe('Parameters for retrieving a single system user.');

const OutputSchema = z
    .looseObject({
        systemuserid: z.string().describe('GUID of the system user.'),
        fullname: z.string().optional().describe('Full display name of the user.'),
        firstname: z.string().optional().describe('First name of the user.'),
        middlename: z.string().optional().describe('Middle name of the user.'),
        lastname: z.string().optional().describe('Last name of the user.'),
        internalemailaddress: z.string().optional().describe('Primary internal email address of the user.'),
        personalemailaddress: z.string().optional().describe('Personal email address of the user.'),
        domainname: z.string().optional().describe('Sign-in name (user principal name) of the user.'),
        title: z.string().optional().describe('Title (salutation) of the user, e.g. "Mr." or "Dr.". Not the job title.'),
        jobtitle: z.string().optional().describe('Job title of the user.'),
        mobilephone: z.string().optional().describe('Mobile phone number of the user.'),
        businessunitid: z.string().optional().describe('GUID of the business unit the user belongs to.'),
        parentsystemuserid: z.string().optional().describe("GUID of the user's manager (parent system user)."),
        territoryid: z.string().optional().describe('GUID of the territory the user belongs to.'),
        isdisabled: z.boolean().optional().describe('Whether the user account is disabled.'),
        islicensed: z.boolean().optional().describe('Whether the user is licensed.'),
        isintegrationuser: z.boolean().optional().describe('Whether the user is an integration (application/service) user.'),
        accessmode: z
            .number()
            .optional()
            .describe('Access mode: 0 Read-Write, 1 Administrative, 2 Read, 3 Support User, 4 Non-interactive, 5 Delegated Admin.'),
        azureactivedirectoryobjectid: z.string().optional().describe('Microsoft Entra ID (Azure AD) object id of the user.'),
        applicationid: z.string().optional().describe('Application id for application (service principal) users.'),
        createdon: z.string().optional().describe('ISO 8601 timestamp of when the user record was created.'),
        modifiedon: z.string().optional().describe('ISO 8601 timestamp of when the user record was last modified.')
    })
    .describe(
        'The retrieved system user. Attributes beyond the ones listed, including custom user fields, depend on the select input and are passed through unchanged.'
    );

const KNOWN_USER_KEYS = new Set([
    'systemuserid',
    'fullname',
    'firstname',
    'middlename',
    'lastname',
    'internalemailaddress',
    'personalemailaddress',
    'domainname',
    'title',
    'jobtitle',
    'mobilephone',
    '_businessunitid_value',
    '_parentsystemuserid_value',
    '_territoryid_value',
    'isdisabled',
    'islicensed',
    'isintegrationuser',
    'accessmode',
    'azureactivedirectoryobjectid',
    'applicationid',
    'createdon',
    'modifiedon'
]);

const ProviderUserSchema = z.looseObject({
    systemuserid: z.string(),
    fullname: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    middlename: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    internalemailaddress: z.string().nullable().optional(),
    personalemailaddress: z.string().nullable().optional(),
    domainname: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    jobtitle: z.string().nullable().optional(),
    mobilephone: z.string().nullable().optional(),
    _businessunitid_value: z.string().nullable().optional(),
    _parentsystemuserid_value: z.string().nullable().optional(),
    _territoryid_value: z.string().nullable().optional(),
    isdisabled: z.boolean().nullable().optional(),
    islicensed: z.boolean().nullable().optional(),
    isintegrationuser: z.boolean().nullable().optional(),
    accessmode: z.number().nullable().optional(),
    azureactivedirectoryobjectid: z.string().nullable().optional(),
    applicationid: z.string().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a single provider GET against the systemusers entity set and mutates nothing.
 * @pitfalls: A nonexistent id throws the provider's 404 error rather than returning an empty result.
 */
const action = createAction({
    description: 'Retrieve a single system user by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.select && input.select.length > 0) {
            params['$select'] = input.select.join(',');
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/systemusers(${encodeURIComponent(input.systemuserid)})`,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const user = ProviderUserSchema.parse(response.data);
        const extraFields = Object.fromEntries(Object.entries(user).filter(([key]) => !KNOWN_USER_KEYS.has(key)));

        return {
            ...extraFields,
            systemuserid: user.systemuserid,
            ...(user.fullname != null && { fullname: user.fullname }),
            ...(user.firstname != null && { firstname: user.firstname }),
            ...(user.middlename != null && { middlename: user.middlename }),
            ...(user.lastname != null && { lastname: user.lastname }),
            ...(user.internalemailaddress != null && { internalemailaddress: user.internalemailaddress }),
            ...(user.personalemailaddress != null && { personalemailaddress: user.personalemailaddress }),
            ...(user.domainname != null && { domainname: user.domainname }),
            ...(user.title != null && { title: user.title }),
            ...(user.jobtitle != null && { jobtitle: user.jobtitle }),
            ...(user.mobilephone != null && { mobilephone: user.mobilephone }),
            ...(user._businessunitid_value != null && { businessunitid: user._businessunitid_value }),
            ...(user._parentsystemuserid_value != null && { parentsystemuserid: user._parentsystemuserid_value }),
            ...(user._territoryid_value != null && { territoryid: user._territoryid_value }),
            ...(user.isdisabled != null && { isdisabled: user.isdisabled }),
            ...(user.islicensed != null && { islicensed: user.islicensed }),
            ...(user.isintegrationuser != null && { isintegrationuser: user.isintegrationuser }),
            ...(user.accessmode != null && { accessmode: user.accessmode }),
            ...(user.azureactivedirectoryobjectid != null && { azureactivedirectoryobjectid: user.azureactivedirectoryobjectid }),
            ...(user.applicationid != null && { applicationid: user.applicationid }),
            ...(user.createdon != null && { createdon: user.createdon }),
            ...(user.modifiedon != null && { modifiedon: user.modifiedon })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
