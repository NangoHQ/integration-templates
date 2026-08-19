import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('The unique identifier of the team to delete.')
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    parentId: z.number().optional(),
    name: z.string(),
    slug: z.string().optional(),
    logoUrl: z.string().optional(),
    calVideoLogo: z.string().optional(),
    appLogo: z.string().optional(),
    appIconLogo: z.string().optional(),
    bio: z.string().optional(),
    hideBranding: z.boolean().optional(),
    isOrganization: z.boolean(),
    isPrivate: z.boolean().optional(),
    hideBookATeamMember: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    theme: z.string().optional(),
    brandColor: z.string().optional(),
    darkBrandColor: z.string().optional(),
    bannerUrl: z.string().optional(),
    timeFormat: z.number().optional(),
    timeZone: z.string().optional(),
    weekStart: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('The unique identifier of the deleted team.'),
    parentId: z.number().optional().describe('The parent team ID, if applicable.'),
    name: z.string().describe('The name of the deleted team.'),
    slug: z.string().optional().describe('The URL slug of the deleted team.'),
    logoUrl: z.string().optional().describe('Logo image URL of the deleted team.'),
    calVideoLogo: z.string().optional().describe('Cal Video logo URL of the deleted team.'),
    appLogo: z.string().optional().describe('App logo URL of the deleted team.'),
    appIconLogo: z.string().optional().describe('App icon logo URL of the deleted team.'),
    bio: z.string().optional().describe('Biography or description of the deleted team.'),
    hideBranding: z.boolean().optional().describe('Whether branding is hidden for the deleted team.'),
    isOrganization: z.boolean().describe('Whether the deleted team is an organization.'),
    isPrivate: z.boolean().optional().describe('Whether the deleted team is private.'),
    hideBookATeamMember: z.boolean().optional().describe('Whether booking a team member is hidden.'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Additional metadata associated with the deleted team.'),
    theme: z.string().optional().describe('Theme setting of the deleted team.'),
    brandColor: z.string().optional().describe('Brand color of the deleted team.'),
    darkBrandColor: z.string().optional().describe('Dark brand color of the deleted team.'),
    bannerUrl: z.string().optional().describe('Banner image URL of the deleted team.'),
    timeFormat: z.number().optional().describe('Time format preference of the deleted team.'),
    timeZone: z.string().optional().describe('Time zone of the deleted team.'),
    weekStart: z.string().optional().describe('Day the week starts on for the deleted team.')
});

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a team from Cal.com.
 * @pitfalls: The API returns 403 for inaccessible or non-existent team IDs instead of 404, and deleting a team permanently removes all associated event types and bookings.
 */
const action = createAction({
    description: 'Delete or archive a team in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['TEAM_PROFILE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://cal.com/docs/api-reference/v2/teams/delete-a-team
            endpoint: `/teams/${encodeURIComponent(input.teamId)}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                status: z.enum(['success', 'error']),
                data: ProviderTeamSchema
            })
            .parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Team deletion failed.',
                teamId: input.teamId
            });
        }

        const team = providerResponse.data;

        return {
            id: team.id,
            name: team.name,
            isOrganization: team.isOrganization,
            ...(team.parentId !== undefined && { parentId: team.parentId }),
            ...(team.slug !== undefined && { slug: team.slug }),
            ...(team.logoUrl !== undefined && { logoUrl: team.logoUrl }),
            ...(team.calVideoLogo !== undefined && { calVideoLogo: team.calVideoLogo }),
            ...(team.appLogo !== undefined && { appLogo: team.appLogo }),
            ...(team.appIconLogo !== undefined && { appIconLogo: team.appIconLogo }),
            ...(team.bio !== undefined && { bio: team.bio }),
            ...(team.hideBranding !== undefined && { hideBranding: team.hideBranding }),
            ...(team.isPrivate !== undefined && { isPrivate: team.isPrivate }),
            ...(team.hideBookATeamMember !== undefined && { hideBookATeamMember: team.hideBookATeamMember }),
            ...(team.metadata !== undefined && { metadata: team.metadata }),
            ...(team.theme !== undefined && { theme: team.theme }),
            ...(team.brandColor !== undefined && { brandColor: team.brandColor }),
            ...(team.darkBrandColor !== undefined && { darkBrandColor: team.darkBrandColor }),
            ...(team.bannerUrl !== undefined && { bannerUrl: team.bannerUrl }),
            ...(team.timeFormat !== undefined && { timeFormat: team.timeFormat }),
            ...(team.timeZone !== undefined && { timeZone: team.timeZone }),
            ...(team.weekStart !== undefined && { weekStart: team.weekStart })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
