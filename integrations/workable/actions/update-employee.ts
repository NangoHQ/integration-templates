import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The employee id. Example: "375b"'),
    member_id: z.string().describe('The member id for account tokens. Example: "79ab3f"'),
    employee: z.record(z.string(), z.unknown()).describe('Partial employee fields to update. Example: { job_title: "Account Manager" }')
});

const OutputSchema = z
    .object({
        id: z.string(),
        firstname: z.string().nullish(),
        lastname: z.string().nullish(),
        email: z.string().nullish(),
        start_date: z.string().nullish(),
        state: z.string().nullish(),
        employee_number: z.string().nullish(),
        avatar: z.string().nullish(),
        phone: z.string().nullish(),
        job_title: z.string().nullish(),
        manager_id: z.string().nullish(),
        department_id: z.string().nullish(),
        template_id: z.string().nullish(),
        division_id: z.string().nullish(),
        candidate_id: z.string().nullish(),
        roles: z.string().nullish(),
        legal_entity_id: z.string().nullish(),
        work_schedule_id: z.string().nullish(),
        work_email: z.string().nullish()
    })
    .passthrough();

const action = createAction({
    description: 'Update an existing employee.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/update-employee
        const response = await nango.patch({
            endpoint: `/spi/v3/employees/${encodeURIComponent(input.id)}`,
            data: {
                member_id: input.member_id,
                employee: input.employee
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Employee with id ${input.id} not found`
            });
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Workable returned an empty response'
            });
        }

        const providerEmployee = OutputSchema.parse(response.data);

        return providerEmployee;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
