import { z } from 'zod';
import { createAction } from 'nango';

const CollaborationRuleSchema = z.object({
    role: z.string().optional(),
    departments: z
        .array(
            z.object({
                any: z.boolean().optional(),
                id: z.string().optional()
            })
        )
        .optional(),
    locations: z
        .array(
            z.object({
                any: z.boolean().optional(),
                country_code: z.string().optional(),
                city: z.string().optional(),
                state_code: z.string().optional(),
                subregion: z.string().optional(),
                zip_code: z.string().optional(),
                location_string: z.string().optional(),
                country_name: z.string().optional(),
                center: z.string().optional()
            })
        )
        .optional()
});

const InputSchema = z.object({
    email: z.string().describe('The email of the new member. Example: "john.doe@workable.com"'),
    roles: z.array(z.string()).describe('The member\'s roles. Example: ["ats.simple"]'),
    member_id: z.string().describe('The id of the member sending the invitation. Required for account/API-key tokens. Example: "1f395d"'),
    collaboration_rules: z.array(CollaborationRuleSchema).optional()
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    email: z.string(),
    roles: z.array(z.string()).optional(),
    collaboration_rules: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The invite id. Example: "196b"'),
    email: z.string(),
    roles: z.array(z.string()).optional(),
    collaboration_rules: z.array(z.object({}).passthrough()).optional()
});

const action = createAction({
    description: 'Invite a new account member by email',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_members'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workable.readme.io/reference/members-invite
            endpoint: '/spi/v3/members/invite',
            data: {
                email: input.email,
                roles: input.roles,
                member_id: input.member_id,
                ...(input.collaboration_rules !== undefined && { collaboration_rules: input.collaboration_rules })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            email: providerResponse.email,
            ...(providerResponse.roles !== undefined && { roles: providerResponse.roles }),
            ...(providerResponse.collaboration_rules !== undefined && { collaboration_rules: providerResponse.collaboration_rules })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
