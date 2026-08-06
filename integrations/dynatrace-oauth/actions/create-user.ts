import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email().describe('Email address of the user to invite. Example: "user@example.com"')
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const ProviderResponseSchema = z.object({
    userUuid: z.string()
});

const OutputSchema = z.object({
    userUuid: z.string().describe('UUID of the newly created user')
});

const action = createAction({
    description: 'Invite/create a new user in this account by email',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Metadata is missing accountUuid.'
            });
        }

        const accountUuid = parsedMetadata.data.accountUuid;

        const response = await nango.post({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/users/post-user
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/users`,
            data: {
                email: input.email
            },
            retries: 1
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not contain the expected userUuid field.',
                raw: response.data
            });
        }

        return {
            userUuid: parsed.data.userUuid
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
