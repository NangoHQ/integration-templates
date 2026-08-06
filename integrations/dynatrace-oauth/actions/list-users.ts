import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserLoginMetadataSchema = z.object({
    successfulLoginCounter: z.number().optional(),
    failedLoginCounter: z.number().optional(),
    lastSuccessfulLogin: z.string().optional(),
    lastFailedLogin: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    resetPasswordTokenSentAt: z.string().nullable().optional(),
    lastSuccessfulBasicAuthentication: z.string().nullable().optional()
});

const ProviderUserSchema = z.object({
    uid: z.string(),
    email: z.string(),
    name: z.string().optional(),
    surname: z.string().optional(),
    type: z.string().optional(),
    userStatus: z.string().optional(),
    emergencyContact: z.boolean().optional(),
    userLoginMetadata: ProviderUserLoginMetadataSchema.optional()
});

const ProviderListResponseSchema = z.object({
    count: z.number(),
    items: z.array(ProviderUserSchema)
});

const UserLoginMetadataSchema = z.object({
    successfulLoginCounter: z.number().optional(),
    failedLoginCounter: z.number().optional(),
    lastSuccessfulLogin: z.string().optional(),
    lastFailedLogin: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    resetPasswordTokenSentAt: z.string().optional(),
    lastSuccessfulBasicAuthentication: z.string().optional()
});

const UserSchema = z.object({
    uid: z.string(),
    email: z.string(),
    name: z.string().optional(),
    surname: z.string().optional(),
    type: z.string().optional(),
    userStatus: z.string().optional(),
    emergencyContact: z.boolean().optional(),
    userLoginMetadata: UserLoginMetadataSchema.optional()
});

const OutputSchema = z.object({
    count: z.number(),
    items: z.array(UserSchema)
});

function normalizeUserLoginMetadata(meta: z.infer<typeof ProviderUserLoginMetadataSchema> | undefined): z.infer<typeof UserLoginMetadataSchema> | undefined {
    if (!meta) {
        return undefined;
    }

    return {
        ...(meta.successfulLoginCounter !== undefined && { successfulLoginCounter: meta.successfulLoginCounter }),
        ...(meta.failedLoginCounter !== undefined && { failedLoginCounter: meta.failedLoginCounter }),
        ...(meta.lastSuccessfulLogin !== undefined && { lastSuccessfulLogin: meta.lastSuccessfulLogin }),
        ...(meta.lastFailedLogin != null && { lastFailedLogin: meta.lastFailedLogin }),
        ...(meta.createdAt !== undefined && { createdAt: meta.createdAt }),
        ...(meta.updatedAt !== undefined && { updatedAt: meta.updatedAt }),
        ...(meta.resetPasswordTokenSentAt != null && { resetPasswordTokenSentAt: meta.resetPasswordTokenSentAt }),
        ...(meta.lastSuccessfulBasicAuthentication != null && { lastSuccessfulBasicAuthentication: meta.lastSuccessfulBasicAuthentication })
    };
}

function normalizeUser(user: z.infer<typeof ProviderUserSchema>): z.infer<typeof UserSchema> {
    return {
        uid: user.uid,
        email: user.email,
        ...(user.name !== undefined && { name: user.name }),
        ...(user.surname !== undefined && { surname: user.surname }),
        ...(user.type !== undefined && { type: user.type }),
        ...(user.userStatus !== undefined && { userStatus: user.userStatus }),
        ...(user.emergencyContact !== undefined && { emergencyContact: user.emergencyContact }),
        ...(user.userLoginMetadata !== undefined && { userLoginMetadata: normalizeUserLoginMetadata(user.userLoginMetadata) })
    };
}

const action = createAction({
    description: 'List users in this Dynatrace account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadata = z.record(z.string(), z.unknown()).parse(rawMetadata);
        const accountUuid = z.string().parse(metadata['accountUuid']);

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/user-management-api/get-all-users
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/users`,
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        return {
            count: providerResponse.count,
            items: providerResponse.items.map(normalizeUser)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
