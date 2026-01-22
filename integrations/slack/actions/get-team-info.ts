/**
 * Instructions: Retrieves information about the workspace
 * API: https://api.slack.com/methods/team.info
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({});

const SlackTeamIconSchema = z.object({
    image_default: z.boolean().optional(),
    image_34: z.string().optional(),
    image_44: z.string().optional(),
    image_68: z.string().optional(),
    image_88: z.string().optional(),
    image_102: z.string().optional(),
    image_132: z.string().optional(),
    image_230: z.string().optional()
});

const SlackTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    domain: z.string(),
    email_domain: z.string().optional(),
    icon: SlackTeamIconSchema.optional(),
    avatar_base_url: z.string().optional(),
    is_verified: z.boolean().optional()
});

const Output = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    team: SlackTeamSchema.describe('The team object with workspace details like name, domain, icon')
});

const action = createAction({
    description: 'Retrieves information about the workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/get-team-info',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['team:read'],
    exec: async (nango, _input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/team.info
            endpoint: 'team.info',
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            team: response.data.team
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
