/**
 * Instructions: Lists all user groups in the workspace
 * API: https://api.slack.com/methods/usergroups.list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    include_disabled: z.boolean().optional().describe('Include disabled user groups. Default: false'),
    include_count: z.boolean().optional().describe('Include member counts. Default: false')
});

const SlackUserGroupPrefsSchema = z.object({
    channels: z.array(z.string()).optional(),
    groups: z.array(z.string()).optional()
});

const SlackUserGroupSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    is_usergroup: z.boolean(),
    is_subteam: z.boolean().optional(),
    name: z.string(),
    description: z.string().optional(),
    handle: z.string(),
    is_external: z.boolean().optional(),
    date_create: z.number().optional(),
    date_update: z.number().optional(),
    date_delete: z.number().optional(),
    auto_type: z.string().nullable().optional(),
    auto_provision: z.boolean().optional(),
    enterprise_subteam_id: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    deleted_by: z.string().nullable().optional(),
    prefs: SlackUserGroupPrefsSchema.optional(),
    user_count: z.number().optional(),
    channel_count: z.number().optional()
});

const Output = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    usergroups: z.array(SlackUserGroupSchema).describe('Array of user group objects')
});

const action = createAction({
    description: 'Lists all user groups in the workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/list-user-groups',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['usergroups:read'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/usergroups.list
            endpoint: 'usergroups.list',
            params: {
                ...(input.include_disabled !== undefined && { include_disabled: input.include_disabled.toString() }),
                ...(input.include_count !== undefined && { include_count: input.include_count.toString() })
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            usergroups: response.data.usergroups
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
