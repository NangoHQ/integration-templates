import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('User ID. Example: 1522999'),
    emailAddress: z.string().optional().describe('Email address. Pass an empty string to explicitly clear.'),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    startDate: z.string().optional().describe('Start date in ISO 8601 format. Example: 2024-01-01'),
    birthday: z.string().optional().describe('Birthday in ISO 8601 format. Example: 1990-06-15'),
    departmentId: z.number().optional().describe('Department ID to assign the user to.'),
    admin: z.boolean().optional().describe('Whether the user is an admin. Requires the user to have an email address.'),
    director: z.boolean().optional().describe('Whether the user is a director.'),
    approverId: z.number().optional().describe('Approver user ID. Pass 0 to default to department boss.'),
    publicHolidaySetId: z.number().optional().describe('Public holiday set ID. Requires hasPublicHolidays to be true.'),
    hasPublicHolidays: z.boolean().optional().describe('Whether public holidays are enabled for this user.')
});

const ProviderResponseSchema = z.object({
    errorStatus: z.number(),
    errorMessage: z.string().nullable()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Update fields on an existing user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.emailAddress !== undefined) {
            body['emailAddress'] = input.emailAddress;
        }
        if (input.firstname !== undefined) {
            body['firstname'] = input.firstname;
        }
        if (input.lastname !== undefined) {
            body['lastname'] = input.lastname;
        }
        if (input.startDate !== undefined) {
            body['startDate'] = input.startDate;
        }
        if (input.birthday !== undefined) {
            body['birthday'] = input.birthday;
        }
        if (input.departmentId !== undefined) {
            body['departmentId'] = input.departmentId;
        }
        if (input.admin !== undefined) {
            body['admin'] = input.admin;
        }
        if (input.director !== undefined) {
            body['director'] = input.director;
        }
        if (input.approverId !== undefined) {
            body['approverId'] = input.approverId;
        }
        if (input.publicHolidaySetId !== undefined) {
            body['publicHolidaySetId'] = input.publicHolidaySetId;
        }
        if (input.hasPublicHolidays !== undefined) {
            body['hasPublicHolidays'] = input.hasPublicHolidays;
        }

        let response;
        try {
            response = await nango.post({
                // https://timetastic.co.uk/api/
                endpoint: `/users/edit/${encodeURIComponent(String(input.id))}`,
                data: body,
                retries: 1
            });
        } catch (err: unknown) {
            const data =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof err.response === 'object' &&
                err.response !== null &&
                'data' in err.response
                    ? err.response.data
                    : undefined;
            const parsedError = ProviderResponseSchema.safeParse(data);
            throw new nango.ActionError({
                type: 'edit_failed',
                message: (parsedError.success && parsedError.data.errorMessage) || 'User edit failed',
                ...(parsedError.success && { errorStatus: parsedError.data.errorStatus })
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errorStatus !== 0) {
            throw new nango.ActionError({
                type: 'edit_failed',
                message: providerResponse.errorMessage ?? 'User edit failed',
                errorStatus: providerResponse.errorStatus
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
