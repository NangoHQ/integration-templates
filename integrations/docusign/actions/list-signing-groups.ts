import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('The DocuSign account ID from the post-connection script.')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const SigningGroupUserSchema = z.object({
    email: z.string().optional(),
    userName: z.string().optional()
});

const SigningGroupSchema = z.object({
    created: z.string().optional(),
    createdBy: z.string().optional(),
    groupEmail: z.string().optional(),
    groupName: z.string().optional(),
    groupType: z.string().optional(),
    modified: z.string().optional(),
    modifiedBy: z.string().optional(),
    signingGroupId: z.string().optional(),
    users: z.array(SigningGroupUserSchema).optional()
});

const ProviderResponseSchema = z.object({
    groups: z.array(SigningGroupSchema).optional()
});

const SigningGroupOutputSchema = z.object({
    signingGroupId: z.string().optional(),
    groupName: z.string().optional(),
    groupEmail: z.string().optional(),
    groupType: z.string().optional(),
    created: z.string().optional(),
    createdBy: z.string().optional(),
    modified: z.string().optional(),
    modifiedBy: z.string().optional(),
    users: z.array(SigningGroupUserSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(SigningGroupOutputSchema)
});

const action = createAction({
    description: 'List signing groups (shared signature groups) for the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    endpoint: {
        method: 'GET',
        path: '/actions/list-signing-groups'
    },

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        if (typeof metadata !== 'object' || metadata === null || !('accountId' in metadata) || typeof metadata.accountId !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }
        const accountId = metadata.accountId;

        const response = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/signinggroups/signinggroups/get/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/signing_groups`,
            params: {
                include_users: 'true'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider response could not be parsed.'
            });
        }

        const groups = providerResponse.data.groups ?? [];

        return {
            items: groups.map((group) => ({
                ...(group.signingGroupId !== undefined && { signingGroupId: group.signingGroupId }),
                ...(group.groupName !== undefined && { groupName: group.groupName }),
                ...(group.groupEmail !== undefined && { groupEmail: group.groupEmail }),
                ...(group.groupType !== undefined && { groupType: group.groupType }),
                ...(group.created !== undefined && { created: group.created }),
                ...(group.createdBy !== undefined && { createdBy: group.createdBy }),
                ...(group.modified !== undefined && { modified: group.modified }),
                ...(group.modifiedBy !== undefined && { modifiedBy: group.modifiedBy }),
                ...(group.users !== undefined && { users: group.users })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
