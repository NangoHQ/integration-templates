import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uid: z.string().describe('Service user uid. Example: "4cd1f263-743b-449c-9465-784bf1156c02"')
});

const ProviderServiceUserSchema = z.object({
    uid: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
    surname: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional()
});

const OutputSchema = z.object({
    uid: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
    surname: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional()
});

const MetadataSchema = z.object({
    accountUuid: z.string().describe('Dynatrace account UUID. Example: "9610a717-798c-423b-a80f-97cfebe72f89"')
});

const action = createAction({
    description: 'Get a single service user by uid.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['iam:service-users:use'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const accountUuid = metadata.accountUuid;

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/service-users-api/get-service-user
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/service-users/${encodeURIComponent(input.uid)}`,
            retries: 3
        });

        const providerUser = ProviderServiceUserSchema.parse(response.data);

        return {
            uid: providerUser.uid,
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.surname !== undefined && { surname: providerUser.surname }),
            ...(providerUser.description !== undefined && { description: providerUser.description }),
            ...(providerUser.createdAt !== undefined && { createdAt: providerUser.createdAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
