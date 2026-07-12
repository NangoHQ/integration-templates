import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    slim: z.boolean().optional().describe('Return a lighter payload with fewer fields per member.')
});

const ProviderMemberSchema = z
    .object({
        id: z.string(),
        group_ids: z.array(z.string()).optional().nullable(),
        profile: z
            .object({
                name: z.string().optional().nullable(),
                mention_name: z.string().optional().nullable(),
                email_address: z.string().optional().nullable()
            })
            .optional()
            .nullable()
    })
    .passthrough();

const MemberSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    mention_name: z.string().optional(),
    email_address: z.string().optional(),
    group_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(MemberSchema)
});

const action = createAction({
    description: 'List workspace members.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.shortcut.com/api/rest/v3#List-Members
            endpoint: '/api/v3/members',
            params: {
                ...(input.slim !== undefined && { slim: String(input.slim) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected a flat array of members from the Shortcut API.'
            });
        }

        const providerMembers = z.array(ProviderMemberSchema).parse(response.data);

        const items = providerMembers.map((member) => ({
            id: member.id,
            ...(member.profile?.name != null && { name: member.profile.name }),
            ...(member.profile?.mention_name != null && { mention_name: member.profile.mention_name }),
            ...(member.profile?.email_address != null && { email_address: member.profile.email_address }),
            ...(member.group_ids != null && { group_ids: member.group_ids })
        }));

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
