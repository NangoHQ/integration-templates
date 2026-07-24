import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    member_id: z.string().optional()
});

const ChoiceSchema = z.object({
    id: z.string(),
    employee_field_id: z.number().optional(),
    label: z.string(),
    position: z.number()
});

const SubfieldSchema = z.object({
    id: z.string(),
    label: z.string(),
    hint: z.string().nullable(),
    type: z.string(),
    position: z.number(),
    choices: z.array(ChoiceSchema).optional(),
    date_format: z.string().optional()
});

const EmployeeFieldSchema = z.object({
    id: z.string(),
    label: z.string(),
    hint: z.string().nullable(),
    type: z.string(),
    editable_by: z.string().optional(),
    approvable_by: z.string().optional(),
    viewable_by: z.string().optional(),
    keep_history: z.boolean(),
    is_multiple: z.boolean(),
    autogenerate: z.boolean().optional(),
    date_format: z.string().optional(),
    choices: z.array(ChoiceSchema).optional(),
    subfields: z.array(SubfieldSchema).optional()
});

const OutputSchema = z.array(EmployeeFieldSchema);

const action = createAction({
    description: "List the account's configured employee custom-field/schema definitions.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_account'],
    exec: async (nango, input) => {
        const params: Record<string, string> = {};
        if (input.member_id) {
            params['member_id'] = input.member_id;
        }

        // https://workable.readme.io/reference/employee_fields
        const response = await nango.get({
            endpoint: '/spi/v3/employee_fields',
            params,
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Workable employee_fields endpoint',
                errors: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
