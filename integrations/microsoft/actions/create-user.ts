import { z } from 'zod';
import { createAction } from 'nango';

const PasswordProfileSchema = z.object({
    password: z.string().describe('Password for the user. Example: "Password123!"'),
    forceChangePasswordNextSignIn: z.boolean().optional().describe('Whether user must change password at next sign-in. Example: true')
});

const InputSchema = z.object({
    accountEnabled: z.boolean().optional().describe('Whether the account is enabled. Example: true'),
    displayName: z.string().describe('Display name of the user. Example: "John Doe"'),
    mailNickname: z.string().describe('Mail alias for the user. Example: "johndoe"'),
    userPrincipalName: z.string().describe('User principal name (UPN). Example: "johndoe@contoso.onmicrosoft.com"'),
    passwordProfile: PasswordProfileSchema.describe('Password profile for the user'),
    givenName: z.string().optional().describe('First name of the user. Example: "John"'),
    surname: z.string().optional().describe('Last name of the user. Example: "Doe"'),
    jobTitle: z.string().optional().describe('Job title of the user. Example: "Software Engineer"'),
    department: z.string().optional().describe('Department of the user. Example: "Engineering"'),
    mobilePhone: z.string().optional().describe('Mobile phone number. Example: "+1 555 555 5555"'),
    officeLocation: z.string().optional().describe('Office location. Example: "Building 1"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    userPrincipalName: z.string().nullable().optional(),
    accountEnabled: z.boolean().nullable().optional(),
    givenName: z.string().nullable().optional(),
    surname: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    mobilePhone: z.string().nullable().optional(),
    officeLocation: z.string().nullable().optional(),
    mail: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    userPrincipalName: z.string().optional(),
    accountEnabled: z.boolean().optional(),
    givenName: z.string().optional(),
    surname: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    mobilePhone: z.string().optional(),
    officeLocation: z.string().optional(),
    mail: z.string().optional(),
    createdDateTime: z.string().optional()
});

const action = createAction({
    description: 'Create a user in Microsoft Azure AD',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['User.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/user-post-users
        const response = await nango.post({
            endpoint: '/v1.0/users',
            data: {
                accountEnabled: input.accountEnabled ?? true,
                displayName: input.displayName,
                mailNickname: input.mailNickname,
                userPrincipalName: input.userPrincipalName,
                passwordProfile: input.passwordProfile,
                ...(input.givenName !== undefined && { givenName: input.givenName }),
                ...(input.surname !== undefined && { surname: input.surname }),
                ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
                ...(input.department !== undefined && { department: input.department }),
                ...(input.mobilePhone !== undefined && { mobilePhone: input.mobilePhone }),
                ...(input.officeLocation !== undefined && { officeLocation: input.officeLocation })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create user'
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.displayName != null && { displayName: providerUser.displayName }),
            ...(providerUser.userPrincipalName != null && { userPrincipalName: providerUser.userPrincipalName }),
            ...(providerUser.accountEnabled != null && { accountEnabled: providerUser.accountEnabled }),
            ...(providerUser.givenName != null && { givenName: providerUser.givenName }),
            ...(providerUser.surname != null && { surname: providerUser.surname }),
            ...(providerUser.jobTitle != null && { jobTitle: providerUser.jobTitle }),
            ...(providerUser.department != null && { department: providerUser.department }),
            ...(providerUser.mobilePhone != null && { mobilePhone: providerUser.mobilePhone }),
            ...(providerUser.officeLocation != null && { officeLocation: providerUser.officeLocation }),
            ...(providerUser.mail != null && { mail: providerUser.mail }),
            ...(providerUser.createdDateTime != null && { createdDateTime: providerUser.createdDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
