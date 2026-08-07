import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountUuid: z
        .string()
        .optional()
        .describe('Dynatrace account UUID. If omitted, the action reads it from the connection configuration. Example: "9610a717-798c-423b-a80f-97cfebe72f89"')
});

const ClusterSchema = z
    .object({
        clusterId: z.string().describe('The UUID of the cluster. Example: "12345678-1234-1234-1234-123456789abc"')
    })
    .passthrough();

const OutputSchema = z.object({
    data: z.array(ClusterSchema)
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'List Dynatrace Managed clusters associated with this account (empty for SaaS-only accounts).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-env-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountUuid = input.accountUuid;

        if (!accountUuid) {
            const connection = await nango.getConnection();
            const parsedConfig = ConnectionConfigSchema.safeParse(connection?.connection_config);

            if (!parsedConfig.success) {
                throw new nango.ActionError({
                    type: 'missing_account_uuid',
                    message: 'accountUuid is required in input or connection configuration.'
                });
            }

            accountUuid = parsedConfig.data.accountUuid;
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/environment-management-api/get-clusters-api
        const response = await nango.get({
            endpoint: `env/v2/accounts/${encodeURIComponent(accountUuid)}/clusters`,
            retries: 3
        });

        const parsedResponse = z
            .object({
                data: z.array(z.unknown())
            })
            .safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.'
            });
        }

        const clusters = parsedResponse.data.data.map((item) => {
            const cluster = ClusterSchema.safeParse(item);
            if (!cluster.success) {
                throw new nango.ActionError({
                    type: 'invalid_cluster',
                    message: 'Provider returned a cluster with an unexpected shape.'
                });
            }
            return cluster.data;
        });

        return {
            data: clusters
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
