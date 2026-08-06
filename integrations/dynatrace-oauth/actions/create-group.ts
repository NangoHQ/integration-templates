import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const GroupInputSchema = z.object({
    name: z.string(),
    description: z.string().optional()
});

const InputSchema = z.object({
    groups: z.array(GroupInputSchema)
});

const ProviderGroupSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    owner: z.string(),
    description: z.string(),
    hidden: z.boolean(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    groups: z.array(ProviderGroupSchema)
});

const action = createAction({
    description: 'Create one or more new user groups',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata();
        const accountUuid = metadata.accountUuid;

        const response = await nango.post({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/groups-api/post-group
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups`,
            data: input.groups,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsedGroups = z.array(ProviderGroupSchema).parse(response.data);

        return {
            groups: parsedGroups
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
