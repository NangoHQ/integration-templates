import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

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

const TeamSchema = z
    .object({
        id: z.string().describe('The unique identifier of the team.'),
        parentId: z.string().optional().describe('The unique identifier of the parent team, if any.'),
        name: z.string().describe('The display name of the team.'),
        slug: z.string().optional().describe('The URL-friendly slug of the team.'),
        logoUrl: z.string().optional().describe('The URL of the team logo image.'),
        calVideoLogo: z.string().optional().describe('The URL of the Cal Video logo for the team.'),
        appLogo: z.string().optional().describe('The URL of the app logo for the team.'),
        appIconLogo: z.string().optional().describe('The URL of the app icon logo for the team.'),
        bio: z.string().optional().describe('The biography or description of the team.'),
        hideBranding: z.boolean().optional().describe('Whether the team hides Cal.com branding.'),
        isOrganization: z.boolean().describe('Whether this team represents an organization.'),
        isPrivate: z.boolean().optional().describe('Whether the team is private.'),
        hideBookATeamMember: z.boolean().optional().describe('Whether to hide the option to book a team member.'),
        metadata: z.record(z.string(), z.unknown()).optional().describe('Additional metadata associated with the team.'),
        theme: z.string().optional().describe('The visual theme of the team.'),
        brandColor: z.string().optional().describe('The primary brand color of the team.'),
        darkBrandColor: z.string().optional().describe('The brand color used in dark mode.'),
        bannerUrl: z.string().optional().describe('The URL of the team banner image.'),
        timeFormat: z.number().optional().describe('The preferred time format (12 or 24 hour).'),
        timeZone: z.string().optional().describe('The time zone of the team.'),
        weekStart: z.string().optional().describe('The day the week starts on for the team.')
    })
    .describe('A team in Cal.com representing a group of users with shared scheduling settings.');

const CheckpointSchema = z.object({
    skip: z.number()
});

const sync = createSync({
    description: 'Sync teams from Cal.com.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        let skip: number | undefined = 0;

        const checkpoint = await nango.getCheckpoint();
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }

            skip = parsedCheckpoint.data.skip;
        }

        await nango.trackDeletesStart('Team');

        const proxyConfig: ProxyConfiguration = {
            // https://cal.com/docs/api-reference/v2/teams/get-teams
            endpoint: '/teams',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_start_value: skip ?? 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'take',
                limit: 100,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    skip = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const teams = page.map((item) => {
                const parsed = ProviderTeamSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse team: ${parsed.error.message}`);
                }

                const team = parsed.data;
                return {
                    id: String(team.id),
                    ...(team.parentId != null && { parentId: String(team.parentId) }),
                    name: team.name,
                    ...(team.slug != null && { slug: team.slug }),
                    ...(team.logoUrl != null && { logoUrl: team.logoUrl }),
                    ...(team.calVideoLogo != null && { calVideoLogo: team.calVideoLogo }),
                    ...(team.appLogo != null && { appLogo: team.appLogo }),
                    ...(team.appIconLogo != null && { appIconLogo: team.appIconLogo }),
                    ...(team.bio != null && { bio: team.bio }),
                    ...(team.hideBranding != null && { hideBranding: team.hideBranding }),
                    isOrganization: team.isOrganization,
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
            });

            if (teams.length > 0) {
                await nango.batchSave(teams, 'Team');
            }

            if (skip !== undefined) {
                await nango.saveCheckpoint({ skip });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
