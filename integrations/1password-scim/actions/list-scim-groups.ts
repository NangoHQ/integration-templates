import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter: z.string().optional().describe('SCIM filter expression. Example: \'displayName eq "Engineering"\''),
    count: z.number().int().min(1).max(250).optional().describe('Number of results per page (1-250). Defaults to 100.')
});

const MemberSchema = z.object({
    value: z.string(),
    display: z.string().optional(),
    type: z.string().optional()
});

const MetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderGroupSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    displayName: z.string(),
    members: z.array(MemberSchema).optional(),
    meta: MetaSchema.optional(),
    externalId: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    schemas: z.array(z.string()).optional(),
    totalResults: z.number().int(),
    startIndex: z.number().int(),
    itemsPerPage: z.number().int(),
    Resources: z.array(ProviderGroupSchema)
});

const GroupOutputSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    members: z.array(MemberSchema).optional(),
    meta: MetaSchema.optional(),
    externalId: z.string().optional(),
    schemas: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    groups: z.array(GroupOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List SCIM groups from 1Password SCIM.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-scim-groups',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const startIndex = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(startIndex) || startIndex < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a positive integer representing a SCIM startIndex.'
            });
        }

        const count = input.count ?? 100;
        const params: Record<string, string | number> = {
            startIndex,
            count
        };

        if (input.filter !== undefined && input.filter !== '') {
            params['filter'] = input.filter;
        }

        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Groups',
            baseUrlOverride: 'https://provisioning.1password.com/scim',
            params,
            retries: 3
        });

        const raw = ProviderListResponseSchema.parse(response.data);

        const groups = raw.Resources.map((group) => ({
            id: group.id,
            displayName: group.displayName,
            ...(group.members !== undefined && { members: group.members }),
            ...(group.meta !== undefined && { meta: group.meta }),
            ...(group.externalId !== undefined && { externalId: group.externalId }),
            ...(group.schemas !== undefined && { schemas: group.schemas })
        }));

        const lastIndex = raw.startIndex + raw.itemsPerPage - 1;
        const hasMore = lastIndex < raw.totalResults;

        return {
            groups,
            ...(hasMore && { next_cursor: String(raw.startIndex + raw.itemsPerPage) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
