import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uid: z.string().describe('Service user ID. Example: "4cd1f263-743b-449c-9465-784bf1156c02"'),
    name: z.string().optional().describe('New name for the service user.'),
    description: z.string().optional().describe('New description for the service user.')
});

const OutputSchema = z.object({
    uid: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: "Update a service user's name/description.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.name === undefined && input.description === undefined) {
            throw new nango.ActionError({
                type: 'missing_fields',
                message: 'At least one of name or description must be provided.'
            });
        }

        const metadata = await nango.getMetadata();
        const metadataAccountUuid = metadata && typeof metadata === 'object' && 'accountUuid' in metadata ? metadata['accountUuid'] : undefined;
        const connection = await nango.getConnection();
        const configAccountUuid = connection.connection_config?.['accountUuid'];
        const accountUuid = typeof metadataAccountUuid === 'string' ? metadataAccountUuid : configAccountUuid;
        if (!accountUuid || typeof accountUuid !== 'string') {
            throw new nango.ActionError({
                type: 'missing_config',
                message: 'accountUuid is missing in connection configuration or metadata.'
            });
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/service-users-management-api
        await nango.put({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/service-users/${encodeURIComponent(input.uid)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        return {
            uid: input.uid,
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
