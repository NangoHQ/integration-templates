import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().trim().min(1).describe('The ID of the user to list team memberships for. Example: "b8b30a2e-fdce-46d6-aef0-63ccf6155094"'),
    pageSize: z.number().optional().describe('Number of results to return per page. Example: 10'),
    pageOffset: z.number().optional().describe('Offset for pagination. Example: 0')
});

const TeamMembershipAttributesSchema = z.object({
    role: z.string().nullable().optional(),
    provisioned_by: z.string().nullable().optional(),
    provisioned_at: z.string().nullable().optional()
});

const ResourceIdentifierSchema = z.object({
    type: z.string(),
    id: z.string()
});

const TeamMembershipRelationshipsSchema = z.object({
    team: z
        .object({
            data: ResourceIdentifierSchema.optional()
        })
        .optional(),
    user: z
        .object({
            data: ResourceIdentifierSchema.optional()
        })
        .optional()
});

const TeamMembershipSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: TeamMembershipAttributesSchema.optional(),
    relationships: TeamMembershipRelationshipsSchema.optional()
});

const PaginationSchema = z.object({
    offset: z.number().optional(),
    limit: z.number().optional(),
    total_count: z.number().optional(),
    total_count_with_offset: z.number().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(TeamMembershipSchema),
    meta: z
        .object({
            pagination: PaginationSchema.optional()
        })
        .optional()
});

const MembershipOutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    role: z.string().optional(),
    team_id: z.string().optional(),
    user_id: z.string().optional(),
    attributes: TeamMembershipAttributesSchema.optional(),
    relationships: TeamMembershipRelationshipsSchema.optional()
});

const OutputSchema = z.object({
    memberships: z.array(MembershipOutputSchema),
    pagination: PaginationSchema.optional()
});

const action = createAction({
    description: 'List the teams a specific user belongs to (the inverse view of list-team-memberships, which lists users for a given team).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/teams/
        const response = await nango.get({
            endpoint: `v2/users/${encodeURIComponent(input.userId)}/memberships`,
            params: {
                ...(input.pageSize !== undefined && { 'page[size]': input.pageSize.toString() }),
                ...(input.pageOffset !== undefined && { 'page[offset]': input.pageOffset.toString() })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const memberships = providerResponse.data.map((item) => ({
            id: item.id,
            type: item.type,
            ...(item.attributes?.role != null && { role: item.attributes.role }),
            ...(item.relationships?.team?.data?.id !== undefined && { team_id: item.relationships.team.data.id }),
            ...(item.relationships?.user?.data?.id !== undefined && { user_id: item.relationships.user.data.id }),
            ...(item.attributes !== undefined && { attributes: item.attributes }),
            ...(item.relationships !== undefined && { relationships: item.relationships })
        }));

        return {
            memberships,
            ...(providerResponse.meta?.pagination !== undefined && { pagination: providerResponse.meta.pagination })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
