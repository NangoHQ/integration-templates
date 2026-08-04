import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().trim().min(1).describe('Team ID. Example: "785d215c-9831-4702-8108-ff3b2db500c9"'),
    limit: z.number().optional().describe('Number of memberships to return per page. Example: 20'),
    offset: z.number().optional().describe('Offset of the paginated results. Example: 0')
});

const MembershipAttributesSchema = z
    .object({
        role: z.string().nullable().optional(),
        provisioned_by: z.string().nullable().optional()
    })
    .passthrough();

const RelationshipDataSchema = z
    .object({
        type: z.string(),
        id: z.string()
    })
    .passthrough();

const MembershipRelationshipsSchema = z
    .object({
        user: z
            .object({
                data: RelationshipDataSchema
            })
            .passthrough()
            .optional()
    })
    .passthrough()
    .optional();

const MembershipDataSchema = z
    .object({
        type: z.string(),
        id: z.string(),
        attributes: MembershipAttributesSchema.optional(),
        relationships: MembershipRelationshipsSchema
    })
    .passthrough();

const PageMetaSchema = z
    .object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.number().optional(),
        total_count: z.number().optional(),
        next_offset: z.number().nullable().optional()
    })
    .passthrough()
    .optional();

const MetaSchema = z
    .object({
        page: PageMetaSchema.optional(),
        pagination: PageMetaSchema.optional()
    })
    .passthrough()
    .optional();

const ProviderResponseSchema = z
    .object({
        data: z.array(MembershipDataSchema),
        meta: MetaSchema
    })
    .passthrough();

const OutputMembershipSchema = z.object({
    id: z.string(),
    type: z.string(),
    role: z.string().optional(),
    user_id: z.string().optional(),
    user_type: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    relationships: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(OutputMembershipSchema),
    next_offset: z.number().optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List users who are members of a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.limit !== undefined) {
            params['page[limit]'] = input.limit;
        }
        if (input.offset !== undefined) {
            params['page[offset]'] = input.offset;
        }

        // https://docs.datadoghq.com/api/latest/teams/
        const response = await nango.get({
            endpoint: `v2/team/${encodeURIComponent(input.team_id)}/memberships`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((membership) => {
            const userData = membership.relationships?.user?.data;

            return {
                id: membership.id,
                type: membership.type,
                ...(membership.attributes?.role != null && {
                    role: membership.attributes.role
                }),
                ...(userData?.id !== undefined && { user_id: userData.id }),
                ...(userData?.type !== undefined && { user_type: userData.type }),
                ...(membership.attributes !== undefined && {
                    attributes: membership.attributes
                }),
                ...(membership.relationships !== undefined && {
                    relationships: membership.relationships
                })
            };
        });

        const pageMeta = providerResponse.meta?.page ?? providerResponse.meta?.pagination ?? undefined;

        const total = pageMeta?.total ?? pageMeta?.total_count ?? undefined;

        const nextOffset = pageMeta?.next_offset != null ? pageMeta.next_offset : undefined;

        return {
            items,
            ...(nextOffset !== undefined && { next_offset: nextOffset }),
            ...(total !== undefined && { total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
