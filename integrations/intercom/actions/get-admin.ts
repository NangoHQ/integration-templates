import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the admin. Example: "12345"')
});

const ProviderAdminSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    job_title: z.string().nullable().optional(),
    away_mode_enabled: z.boolean().optional(),
    away_mode_reassign: z.boolean().optional(),
    avatar: z.string().nullable().optional(),
    team_ids: z.array(z.string()).optional(),
    admin_ids: z.array(z.string()).optional(),
    team_only: z.boolean().optional(),
    has_inbox_seat: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    job_title: z.string().optional(),
    away_mode_enabled: z.boolean().optional(),
    away_mode_reassign: z.boolean().optional(),
    avatar: z.string().optional(),
    team_ids: z.array(z.string()).optional(),
    admin_ids: z.array(z.string()).optional(),
    team_only: z.boolean().optional(),
    has_inbox_seat: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve an admin by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-admin',
        group: 'Admins'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Admins
        const response = await nango.get({
            endpoint: `/admins/${encodeURIComponent(input.id)}`,
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Admin not found',
                id: input.id
            });
        }

        const providerAdmin = ProviderAdminSchema.parse(response.data);

        return {
            id: providerAdmin.id,
            type: providerAdmin.type,
            ...(providerAdmin.name != null && { name: providerAdmin.name }),
            ...(providerAdmin.email != null && { email: providerAdmin.email }),
            ...(providerAdmin.job_title != null && { job_title: providerAdmin.job_title }),
            ...(providerAdmin.away_mode_enabled !== undefined && { away_mode_enabled: providerAdmin.away_mode_enabled }),
            ...(providerAdmin.away_mode_reassign !== undefined && { away_mode_reassign: providerAdmin.away_mode_reassign }),
            ...(providerAdmin.avatar != null && { avatar: providerAdmin.avatar }),
            ...(providerAdmin.team_ids !== undefined && { team_ids: providerAdmin.team_ids }),
            ...(providerAdmin.admin_ids !== undefined && { admin_ids: providerAdmin.admin_ids }),
            ...(providerAdmin.team_only !== undefined && { team_only: providerAdmin.team_only }),
            ...(providerAdmin.has_inbox_seat !== undefined && { has_inbox_seat: providerAdmin.has_inbox_seat })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
