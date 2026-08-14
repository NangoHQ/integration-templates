import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('User email address. Example: "user@example.com"')
});

const UserLoginMetadataSchema = z.object({
    successfulLoginCounter: z.number().optional(),
    failedLoginCounter: z.number().optional(),
    lastSuccessfulLogin: z.string().nullable().optional(),
    lastFailedLogin: z.string().nullable().optional(),
    resetPasswordTokenSentAt: z.string().nullable().optional(),
    lastSuccessfulBasicAuthentication: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const GroupSchema = z.object({
    uuid: z.string(),
    owner: z.string(),
    hidden: z.boolean().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    accountName: z.string().optional(),
    accountUUID: z.string().optional(),
    groupName: z.string()
});

const OutputSchema = z.object({
    uid: z.string(),
    email: z.string(),
    name: z.string().optional(),
    surname: z.string().optional(),
    type: z.string().optional(),
    userLoginMetadata: UserLoginMetadataSchema.optional(),
    userStatus: z.string().optional(),
    emergencyContact: z.boolean().optional(),
    groups: z.array(GroupSchema)
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: "Get a single user's full details including their group memberships.",
    version: '1.0.0',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing accountUuid in metadata.'
            });
        }

        const accountUuid = metadataResult.data.accountUuid;

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/user-management/get-user
        const response = await nango.get({
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/users/${encodeURIComponent(input.email)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found.',
                email: input.email
            });
        }

        const providerUser = OutputSchema.parse(response.data);

        return providerUser;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
