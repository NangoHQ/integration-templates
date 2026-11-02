import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        companyId: z.string().min(1).describe("Company UUID defining which employees' state setups belong in this dataset.")
    })
    .describe('Connection metadata selecting the company whose per-state employee tax setups are synced.');

const StateTaxAnswerSchema = z
    .object({
        value: z.union([z.string(), z.number(), z.boolean()]).nullable().optional().describe('Exact typed answer; null differs from no answer.'),
        validFrom: z.iso.date().optional().describe('Informational effective-start calendar date; absent if not returned.'),
        validUpTo: z.iso.date().nullable().optional().describe('Informational effective-end calendar date or null; absent if not returned.')
    })
    .describe('A single stored answer with its informational effective dates.');

const StateTaxInputFormatOptionSchema = z
    .object({
        label: z.string().describe('Choice display label.'),
        value: z.union([z.string(), z.number(), z.boolean()]).optional().describe('Exact typed choice value; omitted if absent upstream.')
    })
    .describe('An allowed choice for a Select question.');

const StateTaxInputFormatSchema = z
    .object({
        type: z.string().describe('Provider kind such as Text, Number, Select, Currency or Date; unknown future kinds preserved.'),
        options: z.array(StateTaxInputFormatOptionSchema).optional().describe('Allowed Select choices, if returned.')
    })
    .describe('Expected answer kind and choices.');

const StateTaxQuestionSchema = z
    .object({
        key: z.string().describe('State-scoped question identifier for updates.'),
        label: z.string().describe('Provider display label.'),
        description: z.string().nullable().describe('Explanation, possibly with inline HTML links; null if none.'),
        adminOnly: z.boolean().describe('Whether a payroll administrator must answer.'),
        inputFormat: StateTaxInputFormatSchema,
        answers: z.array(StateTaxAnswerSchema).describe('Stored answers, currently empty or one entry; empty differs from explicit null.')
    })
    .describe('A state-specific tax question with its expected input format and stored answers.');

const EmployeeStateTaxSetupSchema = z
    .object({
        id: z.string().describe('Employee state setup UUID.'),
        state: z.string().describe('Two-letter US state abbreviation.'),
        questions: z.array(StateTaxQuestionSchema).describe('State-specific questionnaire and stored answers.'),
        employeeId: z.string().describe('Owning employee UUID.'),
        isWorkState: z.boolean().optional().describe('Whether this is a work state, if returned.'),
        fileNewHireReport: z.boolean().nullable().optional().describe('Provider reporting selection or status, preserving null and absence if unavailable.')
    })
    .describe("A company's per-state employee tax setup: dynamic questions, typed answers and administrative metadata.");

const GustoStateTaxAnswerSchema = z.object({
    value: z.union([z.string(), z.number(), z.boolean()]).nullable().optional(),
    valid_from: z.string().optional(),
    valid_up_to: z.string().nullable().optional()
});

const GustoStateTaxInputFormatSchema = z.object({
    type: z.string(),
    options: z
        .array(
            z.object({
                label: z.string(),
                value: z.union([z.string(), z.number(), z.boolean()]).optional()
            })
        )
        .optional()
});

const GustoStateTaxQuestionSchema = z.object({
    key: z.string(),
    label: z.string(),
    description: z.string().nullable(),
    is_question_for_admin_only: z.boolean(),
    input_question_format: GustoStateTaxInputFormatSchema,
    answers: z.array(GustoStateTaxAnswerSchema)
});

const GustoStateTaxSetupSchema = z.object({
    uuid: z.string(),
    employee_uuid: z.string().optional(),
    state: z.string(),
    questions: z.array(GustoStateTaxQuestionSchema),
    is_work_state: z.boolean().optional(),
    file_new_hire_report: z.boolean().nullable().optional()
});

const GustoEmployeeSchema = z.object({
    uuid: z.string()
});

type GustoStateTaxSetup = z.infer<typeof GustoStateTaxSetupSchema>;
type StateTaxAnswer = z.infer<typeof StateTaxAnswerSchema>;
type StateTaxQuestion = z.infer<typeof StateTaxQuestionSchema>;
type EmployeeStateTaxSetup = z.infer<typeof EmployeeStateTaxSetupSchema>;

function mapAnswer(answer: z.infer<typeof GustoStateTaxAnswerSchema>): StateTaxAnswer {
    return {
        // Typed answer kept unchanged; explicit null stays null, absence stays absence.
        ...(answer.value !== undefined && { value: answer.value }),
        // Calendar date passed through without timezone conversion; an empty string is
        // treated as not returned because it cannot represent a date.
        ...(answer.valid_from !== undefined && answer.valid_from !== '' && { validFrom: answer.valid_from }),
        // Gusto documents valid_up_to as "currently always null" while its examples render
        // null as "", so an empty string is normalized to null.
        ...(answer.valid_up_to !== undefined && { validUpTo: answer.valid_up_to === '' ? null : answer.valid_up_to })
    };
}

function mapQuestion(question: z.infer<typeof GustoStateTaxQuestionSchema>): StateTaxQuestion {
    const inputFormat = question.input_question_format;
    return {
        key: question.key,
        label: question.label,
        description: question.description,
        adminOnly: question.is_question_for_admin_only,
        inputFormat: {
            type: inputFormat.type,
            ...(inputFormat.options !== undefined && {
                options: inputFormat.options.map((option) => ({
                    label: option.label,
                    ...(option.value !== undefined && { value: option.value })
                }))
            })
        },
        answers: question.answers.map(mapAnswer)
    };
}

function mapSetup(setup: GustoStateTaxSetup, employeeUuid: string): EmployeeStateTaxSetup {
    return {
        id: setup.uuid,
        employeeId: setup.employee_uuid ?? employeeUuid,
        state: setup.state,
        questions: setup.questions.map(mapQuestion),
        ...(setup.is_work_state !== undefined && { isWorkState: setup.is_work_state }),
        ...(setup.file_new_hire_report !== undefined && { fileNewHireReport: setup.file_new_hire_report })
    };
}

const sync = createSync({
    description: "Make the configured company's per-state employee tax setups available with dynamic questions, typed answers and administrative metadata.",
    version: '1.0.0',
    frequency: 'every day',
    autoStart: false,
    scopes: ['employees:read', 'employee_state_taxes:read'],
    metadata: MetadataSchema,
    models: {
        EmployeeStateTaxSetup: EmployeeStateTaxSetupSchema
    },

    exec: async (nango) => {
        const parsedMetadata = MetadataSchema.safeParse(await nango.getMetadata());
        if (!parsedMetadata.success) {
            throw new Error('sync-employee-state-taxes requires connection metadata with a non-empty companyId (company UUID).');
        }
        const { companyId } = parsedMetadata.data;

        // Full refresh with delete detection: neither endpoint offers a changed-since
        // filter or a deletion feed. Delete-tracked runs always start from page 1, so no
        // checkpoint is used.
        await nango.trackDeletesStart('EmployeeStateTaxSetup');

        const employeesConfig: ProxyConfiguration = {
            // https://docs.gusto.com/embedded-payroll/reference/get-v1-companies-company_id-employees
            endpoint: `/v1/companies/${encodeURIComponent(companyId)}/employees`,
            headers: {
                'X-Gusto-API-Version': '2026-06-15'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per',
                // Documented default page size; the maximum is undocumented, so the
                // guaranteed-honored value avoids silent clamping that would look like
                // a short last page and truncate the dataset.
                limit: 25
            },
            retries: 3
        };

        const employeesResponse = await nango.get<unknown>(employeesConfig);
        // Throw on parse failure: skipping records inside a delete-tracked scan
        // would falsely mark them as deleted.
        const employees = z.array(GustoEmployeeSchema).parse(employeesResponse.data);

        for (const employee of employees) {
            // https://docs.gusto.com/embedded-payroll/reference/get-v1-employees-employee_id-state_taxes
            const response = await nango.get<unknown>({
                endpoint: `/v1/employees/${encodeURIComponent(employee.uuid)}/state_taxes`,
                headers: {
                    'X-Gusto-API-Version': '2026-06-15'
                },
                retries: 3
            });

            const setups = z.array(GustoStateTaxSetupSchema).parse(response.data);

            if (setups.length > 0) {
                await nango.batchSave(
                    setups.map((setup) => mapSetup(setup, employee.uuid)),
                    'EmployeeStateTaxSetup'
                );
            }
        }

        await nango.trackDeletesEnd('EmployeeStateTaxSetup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
