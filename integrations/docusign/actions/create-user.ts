import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('DocuSign account ID from connection metadata.')
});

const InputSchema = z.object({
    userName: z.string().describe('The full name of the user to create.'),
    email: z.string().describe('The email address for the new user.'),
    password: z.string().describe('The password for the new user account.'),
    permissionProfileId: z.string().optional().describe('Permission profile ID for the user. Defaults to DocuSign Sender (52114902).')
});

const ProviderNewUserSchema = z.object({
    userId: z.string().optional(),
    userName: z.string().optional(),
    email: z.string().optional(),
    created: z.string().optional(),
    errorDetails: z
        .object({
            errorCode: z.string().optional(),
            message: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    newUsers: z.array(ProviderNewUserSchema).optional()
});

const OutputSchema = z.object({
    userId: z.string().optional(),
    userName: z.string().optional(),
    email: z.string().optional(),
    created: z.boolean().optional()
});

const action = createAction({
    description: 'Create a new account user.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;
        const permissionProfileId = input.permissionProfileId ?? '52114902';

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountusers/create/
        const response = await nango.post({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/users`,
            data: {
                newUsers: [
                    {
                        userName: input.userName,
                        email: input.email,
                        password: input.password,
                        userSettings: {
                            permissionProfileId: permissionProfileId
                        }
                    }
                ]
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from DocuSign API.'
            });
        }

        const newUsers = providerResponse.data.newUsers;
        if (!newUsers || newUsers.length === 0) {
            throw new nango.ActionError({
                type: 'no_user_created',
                message: 'DocuSign did not return any created user.'
            });
        }

        const createdUser = newUsers[0];
        if (!createdUser) {
            throw new nango.ActionError({
                type: 'no_user_created',
                message: 'DocuSign did not return any created user.'
            });
        }

        if (createdUser.errorDetails) {
            throw new nango.ActionError({
                type: 'api_error',
                message: createdUser.errorDetails.message ?? 'DocuSign returned an error during user creation.',
                error_code: createdUser.errorDetails.errorCode
            });
        }

        return {
            ...(createdUser.userId !== undefined && { userId: createdUser.userId }),
            ...(createdUser.userName !== undefined && { userName: createdUser.userName }),
            ...(createdUser.email !== undefined && { email: createdUser.email }),
            ...(createdUser.created !== undefined && { created: createdUser.created === 'true' || createdUser.created === 'True' })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
