import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        employeeId: z.string().min(1).describe('Employee UUID; the employee must have at least one job.'),
        timeOffPolicyId: z.string().min(1).describe('Policy UUID to enroll the employee in.'),
        startingBalanceHours: z
            .string()
            .regex(/^-?[0-9]+(\.[0-9]+)?$/)
            .optional()
            .describe("Optional exact signed decimal starting balance in hours for a non-unlimited policy; omission leaves Gusto's initial-balance handling.")
    })
    .describe('Enroll one employee in a Gusto time off policy, with an optional starting balance for a limited policy.');

const OutputSchema = z
    .object({
        id: z.string().describe('Policy UUID returned after enrollment.'),
        employees: z
            .array(
                z
                    .object({
                        employeeId: z.string().optional().describe('Member employee UUID.'),
                        balanceHours: z.string().optional().describe('Exact decimal member balance in hours.')
                    })
                    .describe('One employee entry in the returned policy membership snapshot.')
            )
            .describe("Policy's returned membership snapshot, not fabricated per-target success receipts.")
    })
    .describe('Time off policy membership snapshot returned after the enrollment.');

const GustoErrorItemSchema = z.object({
    error_key: z.string().optional(),
    category: z.string().optional(),
    message: z.string().optional()
});

const GustoErrorResponseSchema = z.object({
    errors: z.array(GustoErrorItemSchema)
});

const ProxyFailureSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown()
    })
});

const TimeOffPolicySchema = z.object({
    uuid: z.string(),
    employees: z.array(
        z.object({
            uuid: z.string().optional(),
            balance: z.string().optional()
        })
    )
});

function providerMessages(data: unknown): string[] {
    const parsed = GustoErrorResponseSchema.safeParse(data);
    if (!parsed.success) {
        return [];
    }
    return parsed.data.errors.map((entry) => entry.message).filter((message): message is string => typeof message === 'string');
}

function reportsMissingJob(data: unknown): boolean {
    const parsed = GustoErrorResponseSchema.safeParse(data);
    if (!parsed.success) {
        return false;
    }
    return parsed.data.errors.some((entry) => {
        const fields = [entry.error_key, entry.message];
        return fields.some((field) => typeof field === 'string' && field.toLowerCase().includes('job'));
    });
}

/**
 * @tags: [write, destructive]
 * @tagReason: Enrolls an employee in a Gusto time off policy with a mutating PUT; Gusto does not document re-enrollment of an existing member as safe, so effects on a stored balance may be difficult to reverse.
 * @pitfalls: Enrollment is rejected unless the employee has at least one job and is not terminated, and starting balances are accepted only for non-unlimited policies. The response is the policy's full membership snapshot rather than a per-employee receipt, and Gusto does not document re-enrolling an existing member as safe, so verify membership and balance before retrying.
 */
const tool = createTool({
    name: 'add-employee-to-time-off-policy',
    description: 'Enroll an employee who has at least one job in a time off policy, optionally specifying a starting balance for a limited policy.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Find the policy with `list-time-off-policies`; inspect it using `get-time-off-policy`. The employee must have at least one job. Do not supply a starting balance for unlimited policies. Use `batch-add-employees-to-time-off-policy` for up to 50 employees, or `update-employee-time-off-balance` to change an existing member's balance.",
        requiredScopes: ['time_off_policies:write'],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let response;
        // @allowTryCatch: Gusto HTTP error statuses must be mapped to this tool's public error codes, which the Nango platform cannot do generically.
        try {
            // https://docs.gusto.com/embedded-payroll/reference/put-v1-time_off_policies-time_off_policy_uuid-add_employees.md
            response = await nango.put<unknown>({
                endpoint: `/v1/time_off_policies/${encodeURIComponent(input.timeOffPolicyId)}/add_employees`,
                headers: {
                    'X-Gusto-API-Version': '2026-06-15'
                },
                data: {
                    employees: [
                        {
                            uuid: input.employeeId,
                            ...(input.startingBalanceHours !== undefined && { balance: input.startingBalanceHours })
                        }
                    ]
                },
                retries: 3
            });
        } catch (error) {
            const failure = ProxyFailureSchema.safeParse(error);
            if (!failure.success) {
                throw error;
            }
            const { status, data } = failure.data.response;
            const details = providerMessages(data);
            const suffix = details.length > 0 ? ` Provider detail: ${details.join('; ')}` : '';
            switch (status) {
                case 404:
                    throw new Error(`not_found: The time off policy or employee is unavailable. Verify the policy and employee IDs.${suffix}`);
                case 403:
                    throw new Error(
                        `missing_permissions: Policy write access is missing. Ask the connection owner for the time_off_policies:write scope.${suffix}`
                    );
                case 429:
                    throw new Error(
                        `rate_limit_exceeded: Gusto's request limit is exceeded. Wait for Retry-After and inspect membership before retrying.${suffix}`
                    );
                case 500:
                    throw new Error(`internal_error: Gusto reported an internal error. Read get-time-off-policy before repeating the enrollment.${suffix}`);
                case 503:
                    throw new Error(`third_party_service_unavailable: A Gusto dependency is unavailable. Try later after checking membership.${suffix}`);
                case 422:
                    if (reportsMissingJob(data)) {
                        throw new Error(
                            `employee_has_no_job: The employee has no job and cannot be enrolled. Create or assign a job through the employee job workflow, then enroll.${suffix}`
                        );
                    }
                    throw new Error(
                        `invalid_operation: Gusto rejected the enrollment, starting balance, or current membership state. Inspect get-time-off-policy and correct the enrollment request.${suffix}`
                    );
                case 409:
                    throw new Error(
                        `invalid_operation: Gusto rejected the enrollment because of the policy's current membership state. Inspect get-time-off-policy and correct the enrollment request.${suffix}`
                    );
                default:
                    throw error;
            }
        }

        const policy = TimeOffPolicySchema.safeParse(response.data);
        if (!policy.success) {
            throw new Error(
                'write_result_unknown: The accepted enrollment response could not be mapped. Use get-time-off-policy to verify membership and balance before retrying.'
            );
        }

        return {
            id: policy.data.uuid,
            employees: policy.data.employees.map((member) => ({
                ...(member.uuid !== undefined && { employeeId: member.uuid }),
                ...(member.balance !== undefined && { balanceHours: member.balance })
            }))
        };
    }
});

export default tool;
