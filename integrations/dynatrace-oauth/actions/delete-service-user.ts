import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountUuid: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string().optional()
});

const InputSchema = z.object({
    uid: z.string().describe('The unique identifier of the service user. Example: "4cd1f263-743b-449c-9465-784bf1156c02"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a service user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadataRaw = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(metadataRaw);

        const connectionRaw = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.safeParse(connectionRaw.connection_config);

        const accountUuid = metadata.data?.accountUuid ?? connectionConfig.data?.accountUuid;

        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is required in connection metadata or connection_config.'
            });
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/service-user-management-api/delete-service-user
        await nango.delete({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/service-users/${encodeURIComponent(input.uid)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
