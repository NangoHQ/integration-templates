import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupIds: z.array(z.string()).describe('Array of group IDs to delete. Example: ["36047264", "36047265"]')
});

const ProviderGroupSchema = z.object({
    groupId: z.string(),
    groupName: z.string().optional(),
    groupType: z.string().optional()
});

const OutputSchema = z.object({
    groups: z.array(ProviderGroupSchema)
});

const action = createAction({
    description: 'Delete one or more custom groups',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/delete-groups',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const parsedMetadata = z
            .object({
                accountId: z.string()
            })
            .parse(metadata);

        const accountId = parsedMetadata.accountId;

        const groups = input.groupIds.map((id) => ({ groupId: id }));

        const response = await nango.delete({
            // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/groups/deletegroups/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/groups`,
            data: {
                groups
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                groups: z.array(ProviderGroupSchema).optional()
            })
            .parse(response.data);

        return {
            groups: providerResponse.groups ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
