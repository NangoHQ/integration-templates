import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().min(1).describe('The ID of the user to retrieve. Example: "9fc4580d-5ed8-46c5-9fff-258fd68d533d"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    displayName: z.string().optional().nullable(),
    givenName: z.string().optional().nullable(),
    surname: z.string().optional().nullable(),
    mail: z.string().optional().nullable(),
    userPrincipalName: z.string().optional().nullable(),
    jobTitle: z.string().optional().nullable(),
    officeLocation: z.string().optional().nullable(),
    mobilePhone: z.string().optional().nullable(),
    businessPhones: z.array(z.string()).optional().nullable(),
    preferredLanguage: z.string().optional().nullable(),
    createdDateTime: z.string().optional().nullable(),
    accountEnabled: z.boolean().optional().nullable(),
    department: z.string().optional().nullable(),
    companyName: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    surname: z.string().optional(),
    mail: z.string().optional(),
    userPrincipalName: z.string().optional(),
    jobTitle: z.string().optional(),
    officeLocation: z.string().optional(),
    mobilePhone: z.string().optional(),
    businessPhones: z.array(z.string()).optional(),
    preferredLanguage: z.string().optional(),
    createdDateTime: z.string().optional(),
    accountEnabled: z.boolean().optional(),
    department: z.string().optional(),
    companyName: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single user from Microsoft',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['User.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/user-get
        const response = await nango.get({
            endpoint: `/v1.0/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.displayName != null && { displayName: providerUser.displayName }),
            ...(providerUser.givenName != null && { givenName: providerUser.givenName }),
            ...(providerUser.surname != null && { surname: providerUser.surname }),
            ...(providerUser.mail != null && { mail: providerUser.mail }),
            ...(providerUser.userPrincipalName != null && { userPrincipalName: providerUser.userPrincipalName }),
            ...(providerUser.jobTitle != null && { jobTitle: providerUser.jobTitle }),
            ...(providerUser.officeLocation != null && { officeLocation: providerUser.officeLocation }),
            ...(providerUser.mobilePhone != null && { mobilePhone: providerUser.mobilePhone }),
            ...(providerUser.businessPhones != null && { businessPhones: providerUser.businessPhones }),
            ...(providerUser.preferredLanguage != null && { preferredLanguage: providerUser.preferredLanguage }),
            ...(providerUser.createdDateTime != null && { createdDateTime: providerUser.createdDateTime }),
            ...(providerUser.accountEnabled != null && { accountEnabled: providerUser.accountEnabled }),
            ...(providerUser.department != null && { department: providerUser.department }),
            ...(providerUser.companyName != null && { companyName: providerUser.companyName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
