import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "36046947"'),
    users: z
        .array(
            z.object({
                userId: z.string().describe('User ID. Example: "c9a996ed-50d2-4df4-ac91-a45032721bb6"')
            })
        )
        .describe('Array of users to add to the group')
});

const OutputSchema = z.object({
    users: z
        .array(
            z
                .object({
                    userName: z.string().optional(),
                    userId: z.string().optional(),
                    userType: z.string().optional(),
                    userStatus: z.string().optional(),
                    uri: z.string().optional()
                })
                .passthrough()
        )
        .optional()
});

const action = createAction({
    description: 'Add users to a group',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = z
            .object({
                accountId: z.string()
            })
            .safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }
        const accountId = parsedMetadata.data.accountId;

        const response = await nango.put({
            // https://developers.docusign.com/docs/esign-rest-api/reference/usergroups/groupusers/update/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/groups/${encodeURIComponent(input.groupId)}/users`,
            data: {
                users: input.users
            },
            retries: 3
        });

        const ProviderUserSchema = z
            .object({
                userName: z.string().optional(),
                userId: z.string().optional(),
                userType: z.string().optional(),
                userStatus: z.string().optional(),
                uri: z.string().optional()
            })
            .passthrough();

        const ProviderResponseSchema = z
            .object({
                users: z.array(ProviderUserSchema).optional()
            })
            .passthrough();

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.users !== undefined && { users: providerResponse.users })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
