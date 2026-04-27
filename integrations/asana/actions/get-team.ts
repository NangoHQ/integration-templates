import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_gid: z.string().describe('Globally unique identifier for the team. Example: "12345"')
});

const OrganizationSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const ProviderTeamSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional().nullable(),
    html_description: z.string().optional().nullable(),
    organization: OrganizationSchema.optional().nullable(),
    permalink_url: z.string().optional().nullable(),
    visibility: z.string().optional().nullable(),
    edit_team_name_or_description_access_level: z.string().optional().nullable(),
    edit_team_visibility_or_trash_team_access_level: z.string().optional().nullable(),
    member_invite_management_access_level: z.string().optional().nullable(),
    guest_invite_management_access_level: z.string().optional().nullable(),
    join_request_management_access_level: z.string().optional().nullable(),
    team_member_removal_access_level: z.string().optional().nullable(),
    team_content_management_access_level: z.string().optional().nullable(),
    endorsed: z.boolean().optional().nullable()
});

const OutputSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    html_description: z.string().optional(),
    organization: z
        .object({
            gid: z.string(),
            name: z.string().optional()
        })
        .optional(),
    permalink_url: z.string().optional(),
    visibility: z.string().optional(),
    edit_team_name_or_description_access_level: z.string().optional(),
    edit_team_visibility_or_trash_team_access_level: z.string().optional(),
    member_invite_management_access_level: z.string().optional(),
    guest_invite_management_access_level: z.string().optional(),
    join_request_management_access_level: z.string().optional(),
    team_member_removal_access_level: z.string().optional(),
    team_content_management_access_level: z.string().optional(),
    endorsed: z.boolean().optional()
});

const action = createAction({
    description: 'Fetch a single team by gid.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-team',
        group: 'Teams'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.asana.com/reference/getteam
            endpoint: `/api/1.0/teams/${input.team_gid}`,
            params: {
                opt_fields:
                    'name,description,html_description,organization,permalink_url,visibility,edit_team_name_or_description_access_level,edit_team_visibility_or_trash_team_access_level,member_invite_management_access_level,guest_invite_management_access_level,join_request_management_access_level,team_member_removal_access_level,team_content_management_access_level,endorsed'
            },
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team not found',
                team_gid: input.team_gid
            });
        }

        const providerTeam = ProviderTeamSchema.parse(response.data.data);

        return {
            gid: providerTeam.gid,
            ...(providerTeam.name !== undefined && providerTeam.name !== null && { name: providerTeam.name }),
            ...(providerTeam.description !== undefined && providerTeam.description !== null && { description: providerTeam.description }),
            ...(providerTeam.html_description !== undefined && providerTeam.html_description !== null && { html_description: providerTeam.html_description }),
            ...(providerTeam.organization !== undefined &&
                providerTeam.organization !== null && {
                    organization: {
                        gid: providerTeam.organization.gid,
                        ...(providerTeam.organization.name !== undefined && { name: providerTeam.organization.name })
                    }
                }),
            ...(providerTeam.permalink_url !== undefined && providerTeam.permalink_url !== null && { permalink_url: providerTeam.permalink_url }),
            ...(providerTeam.visibility !== undefined && providerTeam.visibility !== null && { visibility: providerTeam.visibility }),
            ...(providerTeam.edit_team_name_or_description_access_level !== undefined &&
                providerTeam.edit_team_name_or_description_access_level !== null && {
                    edit_team_name_or_description_access_level: providerTeam.edit_team_name_or_description_access_level
                }),
            ...(providerTeam.edit_team_visibility_or_trash_team_access_level !== undefined &&
                providerTeam.edit_team_visibility_or_trash_team_access_level !== null && {
                    edit_team_visibility_or_trash_team_access_level: providerTeam.edit_team_visibility_or_trash_team_access_level
                }),
            ...(providerTeam.member_invite_management_access_level !== undefined &&
                providerTeam.member_invite_management_access_level !== null && {
                    member_invite_management_access_level: providerTeam.member_invite_management_access_level
                }),
            ...(providerTeam.guest_invite_management_access_level !== undefined &&
                providerTeam.guest_invite_management_access_level !== null && {
                    guest_invite_management_access_level: providerTeam.guest_invite_management_access_level
                }),
            ...(providerTeam.join_request_management_access_level !== undefined &&
                providerTeam.join_request_management_access_level !== null && {
                    join_request_management_access_level: providerTeam.join_request_management_access_level
                }),
            ...(providerTeam.team_member_removal_access_level !== undefined &&
                providerTeam.team_member_removal_access_level !== null && { team_member_removal_access_level: providerTeam.team_member_removal_access_level }),
            ...(providerTeam.team_content_management_access_level !== undefined &&
                providerTeam.team_content_management_access_level !== null && {
                    team_content_management_access_level: providerTeam.team_content_management_access_level
                }),
            ...(providerTeam.endorsed !== undefined && providerTeam.endorsed !== null && { endorsed: providerTeam.endorsed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
