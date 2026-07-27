import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    firstName: z.string().describe('First name of the new user. Example: "Jane"'),
    lastName: z.string().describe('Last name of the new user. Example: "Doe"'),
    allowance: z.number().describe('Annual leave allowance in days. Example: 25'),
    departmentId: z.number().describe('Department ID to assign the user to. Example: 248819'),
    emailAddress: z.string().optional().describe('Email address; must match a verified organisation domain. Example: "jane.doe@nango.dev"'),
    leaveYearStart: z.number().int().min(1).max(12).optional().describe('Month the leave year starts (1-12). Example: 1'),
    startDate: z.string().optional().describe('Employment start date in ISO 8601 format. Example: "2026-08-01"'),
    sendWelcomeEmail: z.boolean().optional().describe('Whether to send a welcome email to the new user. Example: true')
});

const ProviderResponseSchema = z.object({
    id: z.number()
});

const OutputSchema = z.object({
    id: z.number().describe('ID of the newly created user. Example: 1523001')
});

const action = createAction({
    description: 'Create a new user, optionally sending a welcome email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
            endpoint: '/users/add',
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                allowance: input.allowance,
                departmentId: input.departmentId,
                ...(input.emailAddress !== undefined && { emailAddress: input.emailAddress }),
                ...(input.leaveYearStart !== undefined && { leaveYearStart: input.leaveYearStart }),
                ...(input.startDate !== undefined && { startDate: input.startDate }),
                ...(input.sendWelcomeEmail !== undefined && { sendWelcomeEmail: input.sendWelcomeEmail })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
