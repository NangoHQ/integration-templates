import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the team.'),
    organizationId: z.number().describe('The ID of the organization.')
});

const TeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    organizationId: z.number(),
    operationsLimit: z.number().nullish(),
    transferLimit: z.number().nullish()
});

const OutputSchema = z.object({
    team: TeamSchema
});

const action = createAction({
    description: 'Create a new team within an organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;

        // @allowTryCatch
        // Make returns 402 when the organization has reached its team license limit.
        // This is an expected, documented failure on Free plans and must be surfaced
        // as a typed ActionError instead of a generic script HTTP error.
        try {
            response = await nango.post({
                // https://developers.make.com/api-documentation/api-reference/teams#create-a-team
                endpoint: '/teams',
                data: {
                    name: input.name,
                    organizationId: input.organizationId
                },
                retries: 1
            });
        } catch (err) {
            if (typeof err === 'object' && err !== null && 'status' in err && err.status === 402) {
                const errorData =
                    typeof err === 'object' &&
                    err !== null &&
                    'response' in err &&
                    typeof err.response === 'object' &&
                    err.response !== null &&
                    'data' in err.response
                        ? err.response.data
                        : undefined;

                const errorBody = z
                    .object({
                        code: z.string().optional(),
                        message: z.string().optional()
                    })
                    .safeParse(errorData);

                throw new nango.ActionError({
                    type: 'license_limit',
                    message:
                        (errorBody.success ? errorBody.data.message : undefined) ||
                        'License limit reached. You need to extend your license to create more teams.',
                    code: (errorBody.success ? errorBody.data.code : undefined) || 'IM027'
                });
            }

            throw err;
        }

        const providerResponse = z
            .object({
                team: z.unknown()
            })
            .parse(response.data);

        const parsedTeam = TeamSchema.parse(providerResponse.team);

        const team = {
            id: parsedTeam.id,
            name: parsedTeam.name,
            organizationId: parsedTeam.organizationId,
            ...(parsedTeam.operationsLimit != null && { operationsLimit: parsedTeam.operationsLimit }),
            ...(parsedTeam.transferLimit != null && { transferLimit: parsedTeam.transferLimit })
        };

        return { team };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
