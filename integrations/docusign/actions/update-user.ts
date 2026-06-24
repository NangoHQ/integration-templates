import { z } from 'zod';
import { createAction } from 'nango';

const UserSettingsSchema = z
    .object({
        canManageAccount: z.string().optional(),
        canSendEnvelope: z.string().optional()
    })
    .optional();

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: c9a996ed-50d2-4df4-ac91-a45032721bb6'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    permissionProfileId: z.string().optional(),
    userSettings: UserSettingsSchema
});

const ProviderUserSchema = z.object({
    userId: z.string().optional(),
    userName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    permissionProfileId: z.string().optional(),
    permissionProfileName: z.string().optional(),
    userStatus: z.string().optional(),
    userType: z.string().optional(),
    userSettings: UserSettingsSchema
});

const OutputSchema = z.object({
    userId: z.string().optional(),
    userName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    permissionProfileId: z.string().optional(),
    permissionProfileName: z.string().optional(),
    userStatus: z.string().optional(),
    userType: z.string().optional(),
    userSettings: UserSettingsSchema
});

const action = createAction({
    description: "Update a user's profile or settings.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/update-user'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            accountId: z.string().optional()
        });
        const parsedMetadata = metadataSchema.parse(metadata);
        const accountId = parsedMetadata.accountId;
        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const updateData: Record<string, unknown> = {
            ...(input.firstName !== undefined && { firstName: input.firstName }),
            ...(input.lastName !== undefined && { lastName: input.lastName }),
            ...(input.title !== undefined && { title: input.title }),
            ...(input.company !== undefined && { company: input.company }),
            ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
            ...(input.permissionProfileId !== undefined && { permissionProfileId: input.permissionProfileId }),
            ...(input.userSettings !== undefined && { userSettings: input.userSettings })
        };

        // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/update/
        const response = await nango.put({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/users/${encodeURIComponent(input.userId)}`,
            data: updateData,
            retries: 10
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            ...(providerUser.userId !== undefined && { userId: providerUser.userId }),
            ...(providerUser.userName !== undefined && { userName: providerUser.userName }),
            ...(providerUser.firstName !== undefined && { firstName: providerUser.firstName }),
            ...(providerUser.lastName !== undefined && { lastName: providerUser.lastName }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.title !== undefined && { title: providerUser.title }),
            ...(providerUser.company !== undefined && { company: providerUser.company }),
            ...(providerUser.jobTitle !== undefined && { jobTitle: providerUser.jobTitle }),
            ...(providerUser.permissionProfileId !== undefined && { permissionProfileId: providerUser.permissionProfileId }),
            ...(providerUser.permissionProfileName !== undefined && { permissionProfileName: providerUser.permissionProfileName }),
            ...(providerUser.userStatus !== undefined && { userStatus: providerUser.userStatus }),
            ...(providerUser.userType !== undefined && { userType: providerUser.userType }),
            ...(providerUser.userSettings !== undefined && { userSettings: providerUser.userSettings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
