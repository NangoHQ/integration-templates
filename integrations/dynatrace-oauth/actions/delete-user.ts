import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email of the user to delete. Example: "user@example.com"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    email: z.string()
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'Delete a user from this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataParse = MetadataSchema.safeParse(metadata);
        if (!metadataParse.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing or invalid accountUuid in metadata.'
            });
        }
        const accountUuid = metadataParse.data.accountUuid;

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/users-api/delete-user
        await nango.delete({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/users/${encodeURIComponent(input.email)}`,
            retries: 10
        });

        return {
            success: true,
            email: input.email
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
