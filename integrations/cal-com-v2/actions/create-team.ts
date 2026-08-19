import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().max(155).describe('Name of the team. Maximum 155 characters. Cannot contain links or URLs.'),
        slug: z.string().optional().describe('Team slug in kebab-case. If omitted, it is generated automatically based on the name.'),
        logoUrl: z.string().optional().describe('URL of the team logo image.'),
        calVideoLogo: z.string().optional().describe('Logo image URL for Cal Video.'),
        appLogo: z.string().optional().describe('App logo image URL.'),
        appIconLogo: z.string().optional().describe('App icon logo image URL.'),
        bio: z.string().optional().describe('Team bio or description.'),
        hideBranding: z.boolean().optional().describe('Whether to hide Cal.com branding.'),
        isPrivate: z.boolean().optional().describe('Whether the team is private.'),
        hideBookATeamMember: z.boolean().optional().describe('Whether to hide the "Book a team member" option.'),
        metadata: z
            .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
            .optional()
            .describe('Additional metadata. Up to 50 keys, each up to 40 characters. Values can be strings (up to 500 characters), numbers, or booleans.'),
        theme: z.string().optional().describe('Team theme.'),
        brandColor: z.string().optional().describe('Brand color for the team.'),
        darkBrandColor: z.string().optional().describe('Brand color for dark mode.'),
        bannerUrl: z.string().optional().describe('URL of the team banner image shown on the booker.'),
        timeFormat: z.number().optional().describe('Time format preference.'),
        timeZone: z.string().optional().describe('Timezone used to create the team default schedule. Defaults to Europe/London.'),
        weekStart: z.string().optional().describe('First day of the week. Defaults to Sunday.'),
        autoAcceptCreator: z
            .boolean()
            .optional()
            .describe('If set to false, the team creator cannot create team event types. Platform customers should not pass false.')
    })
    .describe('Input for creating a team in Cal.com.');

const TeamOutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created team.'),
        parentId: z.number().nullish().describe('Parent team ID if this is a sub-team.'),
        name: z.string().describe('Name of the team.'),
        slug: z.string().nullish().describe('Team slug in kebab-case.'),
        logoUrl: z.string().nullish().describe('URL of the team logo image.'),
        calVideoLogo: z.string().nullish().describe('Logo image URL for Cal Video.'),
        appLogo: z.string().nullish().describe('App logo image URL.'),
        appIconLogo: z.string().nullish().describe('App icon logo image URL.'),
        bio: z.string().nullish().describe('Team bio or description.'),
        hideBranding: z.boolean().nullish().describe('Whether Cal.com branding is hidden.'),
        isOrganization: z.boolean().describe('Whether this team represents an organization.'),
        isPrivate: z.boolean().nullish().describe('Whether the team is private.'),
        hideBookATeamMember: z.boolean().nullish().describe('Whether the "Book a team member" option is hidden.'),
        metadata: z
            .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
            .nullish()
            .describe('Team metadata.'),
        theme: z.string().nullish().describe('Team theme.'),
        brandColor: z.string().nullish().describe('Brand color.'),
        darkBrandColor: z.string().nullish().describe('Brand color for dark mode.'),
        bannerUrl: z.string().nullish().describe('URL of the team banner image.'),
        timeFormat: z.number().nullish().describe('Time format preference.'),
        timeZone: z.string().nullish().describe('Team timezone.'),
        weekStart: z.string().nullish().describe('First day of the week.')
    })
    .describe('A team object returned by Cal.com.');

const OutputSchema = z
    .object({
        status: z.enum(['success', 'error']).describe('Response status.'),
        team: TeamOutputSchema.optional().describe('The created team when available immediately.'),
        message: z.string().optional().describe('Message returned when team creation requires payment.'),
        paymentLink: z.string().optional().describe('Payment link when team creation requires payment.')
    })
    .describe('Output for creating a team in Cal.com.');

const ApiResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.unknown()
});

const PaymentDataSchema = z.object({
    message: z.string(),
    paymentLink: z.string().optional(),
    pendingTeam: TeamOutputSchema.optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new team in the Cal.com account.
 * @pitfalls: Team creation may require payment and return a paymentLink with a pendingTeam instead of an active team. Reusing a name or slug that already exists triggers a 409 conflict.
 */
const action = createAction({
    description: 'Create a team in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['TEAM_PROFILE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://cal.com/docs/api-reference/v2/teams/create-a-team
            endpoint: '/teams',
            data: {
                name: input.name,
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
                ...(input.calVideoLogo !== undefined && { calVideoLogo: input.calVideoLogo }),
                ...(input.appLogo !== undefined && { appLogo: input.appLogo }),
                ...(input.appIconLogo !== undefined && { appIconLogo: input.appIconLogo }),
                ...(input.bio !== undefined && { bio: input.bio }),
                ...(input.hideBranding !== undefined && { hideBranding: input.hideBranding }),
                ...(input.isPrivate !== undefined && { isPrivate: input.isPrivate }),
                ...(input.hideBookATeamMember !== undefined && { hideBookATeamMember: input.hideBookATeamMember }),
                ...(input.metadata !== undefined && { metadata: input.metadata }),
                ...(input.theme !== undefined && { theme: input.theme }),
                ...(input.brandColor !== undefined && { brandColor: input.brandColor }),
                ...(input.darkBrandColor !== undefined && { darkBrandColor: input.darkBrandColor }),
                ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
                ...(input.timeFormat !== undefined && { timeFormat: input.timeFormat }),
                ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
                ...(input.weekStart !== undefined && { weekStart: input.weekStart }),
                ...(input.autoAcceptCreator !== undefined && { autoAcceptCreator: input.autoAcceptCreator })
            },
            retries: 1
        });

        const apiResponse = ApiResponseSchema.safeParse(response.data);
        if (!apiResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Cal.com API.'
            });
        }

        const data = apiResponse.data.data;

        const teamResult = TeamOutputSchema.safeParse(data);
        if (teamResult.success) {
            return {
                status: apiResponse.data.status,
                team: teamResult.data
            };
        }

        const paymentResult = PaymentDataSchema.safeParse(data);
        if (paymentResult.success) {
            return {
                status: apiResponse.data.status,
                message: paymentResult.data.message,
                ...(paymentResult.data.paymentLink !== undefined && { paymentLink: paymentResult.data.paymentLink }),
                ...(paymentResult.data.pendingTeam !== undefined && { team: paymentResult.data.pendingTeam })
            };
        }

        throw new nango.ActionError({
            type: 'invalid_response',
            message: 'Unrecognized response data shape from Cal.com API.'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
