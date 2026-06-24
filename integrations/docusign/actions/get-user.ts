import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The user ID (GUID) to retrieve. Example: "c9a996ed-50d2-4df4-ac91-a45032721bb6"')
});

const MetadataSchema = z.object({
    accountId: z.string().describe('The DocuSign account ID from connection metadata.')
});

const ProviderUserSchema = z.object({
    userId: z.string(),
    userName: z.string().optional(),
    email: z.string().optional(),
    userType: z.string().optional(),
    userStatus: z.string().optional(),
    uri: z.string().optional(),
    createdDateTime: z.string().optional(),
    permissionProfileId: z.string().optional(),
    permissionProfileName: z.string().optional(),
    title: z.string().optional(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    suffixName: z.string().optional(),
    jobTitle: z.string().optional(),
    companyName: z.string().optional(),
    phoneNumber: z.string().optional(),
    faxNumber: z.string().optional(),
    address: z
        .object({
            address1: z.string().optional(),
            address2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional()
        })
        .optional(),
    userSettings: z.record(z.string(), z.unknown()).optional(),
    groupList: z.array(z.record(z.string(), z.unknown())).optional(),
    signatureName: z.string().optional(),
    initialsName: z.string().optional()
});

const OutputSchema = z.object({
    userId: z.string(),
    userName: z.string().optional(),
    email: z.string().optional(),
    userType: z.string().optional(),
    userStatus: z.string().optional(),
    uri: z.string().optional(),
    createdDateTime: z.string().optional(),
    permissionProfileId: z.string().optional(),
    permissionProfileName: z.string().optional(),
    title: z.string().optional(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    suffixName: z.string().optional(),
    jobTitle: z.string().optional(),
    companyName: z.string().optional(),
    phoneNumber: z.string().optional(),
    faxNumber: z.string().optional(),
    address: z
        .object({
            address1: z.string().optional(),
            address2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional()
        })
        .optional(),
    userSettings: z.record(z.string(), z.unknown()).optional(),
    groupList: z.array(z.record(z.string(), z.unknown())).optional(),
    signatureName: z.string().optional(),
    initialsName: z.string().optional()
});

const action = createAction({
    description: "Retrieve a user's detailed profile and settings.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['signature'],
    endpoint: {
        path: '/actions/get-user',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        if (typeof metadata.accountId !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = metadata.accountId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountusers/getuser/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found or invalid response from DocuSign API.',
                userId: input.userId
            });
        }

        const raw = response.data;
        const users = 'users' in raw && Array.isArray(raw.users) && raw.users.length > 0 ? raw.users : null;
        const userData = users ? users[0] : raw;

        if (!userData || typeof userData !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User data not found in response.',
                userId: input.userId
            });
        }

        const providerUser = ProviderUserSchema.parse(userData);

        return {
            userId: providerUser.userId,
            ...(providerUser.userName !== undefined && { userName: providerUser.userName }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.userType !== undefined && { userType: providerUser.userType }),
            ...(providerUser.userStatus !== undefined && { userStatus: providerUser.userStatus }),
            ...(providerUser.uri !== undefined && { uri: providerUser.uri }),
            ...(providerUser.createdDateTime !== undefined && { createdDateTime: providerUser.createdDateTime }),
            ...(providerUser.permissionProfileId !== undefined && { permissionProfileId: providerUser.permissionProfileId }),
            ...(providerUser.permissionProfileName !== undefined && { permissionProfileName: providerUser.permissionProfileName }),
            ...(providerUser.title !== undefined && { title: providerUser.title }),
            ...(providerUser.firstName !== undefined && { firstName: providerUser.firstName }),
            ...(providerUser.middleName !== undefined && { middleName: providerUser.middleName }),
            ...(providerUser.lastName !== undefined && { lastName: providerUser.lastName }),
            ...(providerUser.suffixName !== undefined && { suffixName: providerUser.suffixName }),
            ...(providerUser.jobTitle !== undefined && { jobTitle: providerUser.jobTitle }),
            ...(providerUser.companyName !== undefined && { companyName: providerUser.companyName }),
            ...(providerUser.phoneNumber !== undefined && { phoneNumber: providerUser.phoneNumber }),
            ...(providerUser.faxNumber !== undefined && { faxNumber: providerUser.faxNumber }),
            ...(providerUser.address !== undefined && { address: providerUser.address }),
            ...(providerUser.userSettings !== undefined && { userSettings: providerUser.userSettings }),
            ...(providerUser.groupList !== undefined && { groupList: providerUser.groupList }),
            ...(providerUser.signatureName !== undefined && { signatureName: providerUser.signatureName }),
            ...(providerUser.initialsName !== undefined && { initialsName: providerUser.initialsName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
