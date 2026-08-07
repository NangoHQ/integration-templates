import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupUuid: z.string().describe('The UUID of the Dynatrace group. Example: "3ff4aa6a-df19-44a7-9f5b-4d924dc2b283"')
});

const ProviderGroupMemberSchema = z.object({
    uid: z.string(),
    email: z.string(),
    name: z.string().nullish(),
    surname: z.string().nullish(),
    emergencyContact: z.boolean().nullish(),
    userStatus: z.string().nullish(),
    type: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    count: z.number(),
    items: z.array(ProviderGroupMemberSchema)
});

const GroupMemberSchema = z.object({
    uid: z.string(),
    email: z.string(),
    name: z.string().optional(),
    surname: z.string().optional(),
    emergencyContact: z.boolean().optional(),
    userStatus: z.string().optional(),
    type: z.string().optional()
});

const OutputSchema = z.object({
    count: z.number(),
    items: z.array(GroupMemberSchema)
});

const action = createAction({
    description: 'List the users belonging to a specific group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Metadata is missing or malformed.'
            });
        }

        const accountUuid = 'accountUuid' in metadata && typeof metadata['accountUuid'] === 'string' ? metadata['accountUuid'] : null;

        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is missing from metadata.'
            });
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups/${encodeURIComponent(input.groupUuid)}/users`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            count: parsed.count,
            items: parsed.items.map((item) => ({
                uid: item.uid,
                email: item.email,
                ...(item.name != null && { name: item.name }),
                ...(item.surname != null && { surname: item.surname }),
                ...(item.emergencyContact != null && { emergencyContact: item.emergencyContact }),
                ...(item.userStatus != null && { userStatus: item.userStatus }),
                ...(item.type != null && { type: item.type })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
