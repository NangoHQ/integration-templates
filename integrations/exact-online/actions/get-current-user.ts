import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderMeSchema = z.object({
    CurrentDivision: z.number().int(),
    UserID: z.string(),
    FullName: z.string().optional(),
    Email: z.string().optional()
});

const OutputSchema = z.object({
    current_division: z.number().int(),
    user_id: z.string(),
    full_name: z.string().optional(),
    email: z.string().optional()
});

const action = createAction({
    description: 'Get the current authenticated user and their active division.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Simulation-gen-apiv1-current-Me
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const raw = response.data;
        if (!raw) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Current user data not found'
            });
        }

        let providerData = typeof raw === 'object' && raw !== null && 'd' in raw && typeof raw.d === 'object' && raw.d !== null ? raw.d : raw;

        if (
            typeof providerData === 'object' &&
            providerData !== null &&
            'results' in providerData &&
            Array.isArray(providerData.results) &&
            providerData.results.length > 0
        ) {
            providerData = providerData.results[0];
        }

        const providerUser = ProviderMeSchema.parse(providerData);

        return {
            current_division: providerUser.CurrentDivision,
            user_id: providerUser.UserID,
            ...(providerUser.FullName !== undefined && { full_name: providerUser.FullName }),
            ...(providerUser.Email !== undefined && { email: providerUser.Email })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
