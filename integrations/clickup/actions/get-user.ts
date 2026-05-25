import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.number().describe('User ID. Example: 302438666')
});

const MetadataSchema = z.object({
    team_id: z.string().describe('ClickUp workspace (team) ID. Example: 90152560096')
});

const ErrorResponseDataSchema = z.object({
    code: z.string().optional(),
    ECODE: z.string().optional(),
    err: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.number(),
    username: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    profilePicture: z.string().optional().nullable(),
    initials: z.string().optional().nullable(),
    role: z.number().optional().nullable(),
    role_key: z.string().optional().nullable(),
    last_active: z.string().optional().nullable(),
    date_joined: z.string().optional().nullable(),
    date_invited: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    username: z.string().optional(),
    email: z.string().optional(),
    color: z.string().optional(),
    profile_picture: z.string().optional(),
    initials: z.string().optional(),
    role: z.number().optional(),
    role_key: z.string().optional(),
    last_active: z.string().optional(),
    date_joined: z.string().optional(),
    date_invited: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single workspace member from ClickUp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'team_id is required in metadata.'
            });
        }

        // @allowTryCatch - Fallback to listing all users from team endpoint when Enterprise API returns 403
        // The Enterprise endpoint (GET /api/v2/team/{team_id}/user/{user_id}) returns 403 TEAM_110 for non-Enterprise plans
        // https://developer.clickup.com/reference/getuser
        try {
            const response = await nango.get({
                endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/user/${encodeURIComponent(String(input.user_id))}`,
                retries: 3
            });

            if (response.data && response.data.user) {
                const providerUser = ProviderUserSchema.parse(response.data.user);

                return {
                    id: providerUser.id,
                    ...(providerUser.username != null && { username: providerUser.username }),
                    ...(providerUser.email != null && { email: providerUser.email }),
                    ...(providerUser.color != null && { color: providerUser.color }),
                    ...(providerUser.profilePicture != null && { profile_picture: providerUser.profilePicture }),
                    ...(providerUser.initials != null && { initials: providerUser.initials }),
                    ...(providerUser.role != null && { role: providerUser.role }),
                    ...(providerUser.role_key != null && { role_key: providerUser.role_key }),
                    ...(providerUser.last_active != null && { last_active: providerUser.last_active }),
                    ...(providerUser.date_joined != null && { date_joined: providerUser.date_joined }),
                    ...(providerUser.date_invited != null && { date_invited: providerUser.date_invited })
                };
            }
        } catch (error) {
            // Type narrowing for Nango error response
            if (
                error &&
                typeof error === 'object' &&
                'response' in error &&
                error.response &&
                typeof error.response === 'object' &&
                'status' in error.response &&
                error.response.status === 403
            ) {
                const responseData =
                    'data' in error.response && error.response.data && typeof error.response.data === 'object'
                        ? ErrorResponseDataSchema.parse(error.response.data)
                        : undefined;
                const isEnterpriseError =
                    responseData?.code === 'TEAM_110' || responseData?.ECODE === 'TEAM_110' || (responseData?.err && responseData.err.includes('Enterprise'));

                if (!isEnterpriseError) {
                    throw error;
                }
                // Continue to fallback for Enterprise-only endpoint errors
            } else {
                throw error;
            }
        }

        // Fallback: Get all teams and filter for the user
        // https://developer.clickup.com/reference/getauthorizedteams
        const teamsResponse = await nango.get({
            endpoint: '/api/v2/team',
            retries: 3
        });

        if (!teamsResponse.data || !teamsResponse.data.teams || !Array.isArray(teamsResponse.data.teams)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unable to fetch teams data.'
            });
        }

        // Find the team matching the metadata team_id
        const team = teamsResponse.data.teams.find((t: { id?: string }) => String(t.id) === teamId);

        if (!team || !team.members || !Array.isArray(team.members)) {
            throw new nango.ActionError({
                type: 'team_not_found',
                message: `Team ${teamId} not found or has no members.`
            });
        }

        // Find the member matching the input user_id
        const memberWrapper = team.members.find((m: { user?: { id?: number } }) => m.user?.id === input.user_id);

        if (!memberWrapper || !memberWrapper.user) {
            throw new nango.ActionError({
                type: 'user_not_found',
                message: `User ${input.user_id} not found in team ${teamId}.`
            });
        }

        const providerUser = ProviderUserSchema.parse(memberWrapper.user);

        return {
            id: providerUser.id,
            ...(providerUser.username != null && { username: providerUser.username }),
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.color != null && { color: providerUser.color }),
            ...(providerUser.profilePicture != null && { profile_picture: providerUser.profilePicture }),
            ...(providerUser.initials != null && { initials: providerUser.initials }),
            ...(providerUser.role != null && { role: providerUser.role }),
            ...(providerUser.role_key != null && { role_key: providerUser.role_key }),
            ...(providerUser.last_active != null && { last_active: providerUser.last_active }),
            ...(providerUser.date_joined != null && { date_joined: providerUser.date_joined }),
            ...(providerUser.date_invited != null && { date_invited: providerUser.date_invited })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
