import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('The unique identifier of the team to delete.')
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    parentId: z.number().nullish(),
    name: z.string(),
    slug: z.string().nullish(),
    logoUrl: z.string().nullish(),
    calVideoLogo: z.string().nullish(),
    appLogo: z.string().nullish(),
    appIconLogo: z.string().nullish(),
    bio: z.string().nullish(),
    hideBranding: z.boolean().nullish(),
    isOrganization: z.boolean(),
    isPrivate: z.boolean().nullish(),
    hideBookATeamMember: z.boolean().nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
    theme: z.string().nullish(),
    brandColor: z.string().nullish(),
    darkBrandColor: z.string().nullish(),
    bannerUrl: z.string().nullish(),
    timeFormat: z.number().nullish(),
    timeZone: z.string().nullish(),
    weekStart: z.string().nullish()
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
    description: 'Delete a team in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['TEAM_PROFILE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Cal.com returns 403 for
        // both non-existent and inaccessible teams, which we convert into a structured error.
        try {
            response = await nango.delete({
                // https://cal.com/docs/api-reference/v2/teams/delete-a-team
                endpoint: `/teams/${encodeURIComponent(input.teamId)}`,
                retries: 3
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Team deletion failed.',
                teamId: input.teamId,
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const envelope = z
            .object({
                status: z.enum(['success', 'error']),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (envelope.status !== 'success') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Team deletion failed.',
                teamId: input.teamId
            });
        }

        const team = ProviderTeamSchema.parse(envelope.data);

        return {
            id: team.id,
            name: team.name,
            isOrganization: team.isOrganization,
            ...(team.parentId != null && { parentId: team.parentId }),
            ...(team.slug != null && { slug: team.slug }),
            ...(team.logoUrl != null && { logoUrl: team.logoUrl }),
            ...(team.calVideoLogo != null && { calVideoLogo: team.calVideoLogo }),
            ...(team.appLogo != null && { appLogo: team.appLogo }),
            ...(team.appIconLogo != null && { appIconLogo: team.appIconLogo }),
            ...(team.bio != null && { bio: team.bio }),
            ...(team.hideBranding != null && { hideBranding: team.hideBranding }),
            ...(team.isPrivate != null && { isPrivate: team.isPrivate }),
            ...(team.hideBookATeamMember != null && { hideBookATeamMember: team.hideBookATeamMember }),
            ...(team.metadata != null && { metadata: team.metadata }),
            ...(team.theme != null && { theme: team.theme }),
            ...(team.brandColor != null && { brandColor: team.brandColor }),
            ...(team.darkBrandColor != null && { darkBrandColor: team.darkBrandColor }),
            ...(team.bannerUrl != null && { bannerUrl: team.bannerUrl }),
            ...(team.timeFormat != null && { timeFormat: team.timeFormat }),
            ...(team.timeZone != null && { timeZone: team.timeZone }),
            ...(team.weekStart != null && { weekStart: team.weekStart })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
