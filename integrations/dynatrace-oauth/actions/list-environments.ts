import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const EnvironmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    active: z.boolean()
});

const OutputSchema = z.object({
    data: z.array(EnvironmentSchema)
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'List the monitoring environments (tenants) that belong to this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-env-read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is required in metadata.'
            });
        }

        const accountUuid = parsedMetadata.data.accountUuid;

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/environments
            endpoint: `env/v2/accounts/${encodeURIComponent(accountUuid)}/environments`,
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        url: z.string(),
                        active: z.boolean()
                    })
                )
            })
            .parse(response.data);

        return {
            data: providerResponse.data.map((env) => ({
                id: env.id,
                name: env.name,
                url: env.url,
                active: env.active
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
