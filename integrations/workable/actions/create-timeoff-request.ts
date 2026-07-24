import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.string().describe('Time off category ID. Example: "10014"'),
    from_date: z.string().describe("Start date in 'YYYY-MM-DDTHH:mm:ss.SSS' format with no timezone suffix. Example: '2026-08-01T09:00:00.000'"),
    to_date: z.string().describe("End date in 'YYYY-MM-DDTHH:mm:ss.SSS' format with no timezone suffix. Example: '2026-08-02T17:00:00.000'"),
    employee_id: z.string().optional().describe('Employee ID. Example: "19ff54"'),
    member_id: z.string().optional().describe('Member ID required for account tokens. Example: "1f395d"'),
    half_days: z.unknown().optional().describe('Half-day configuration object.'),
    note: z.string().max(140).optional().describe('Note up to 140 characters.')
});

const ProviderResponseSchema = z
    .object({
        id: z.string(),
        state: z.string().optional(),
        category: z.string().optional(),
        category_id: z.string().optional(),
        from_date: z.string().optional(),
        to_date: z.string().optional(),
        employee_id: z.string().optional(),
        member_id: z.string().optional(),
        half_days: z.unknown().optional(),
        note: z.string().optional(),
        created_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    state: z.string().optional(),
    category: z.string().optional(),
    category_id: z.string().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    employee_id: z.string().optional(),
    member_id: z.string().optional(),
    half_days: z.unknown().optional(),
    note: z.string().optional(),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Submit a new time-off request for an employee.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_timeoff'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.employee_id && !input.member_id) {
            throw new nango.ActionError({
                type: 'missing_required_field',
                message: 'Either employee_id or member_id is required for account tokens.'
            });
        }

        const requestBody: Record<string, unknown> = {
            category_id: input.category_id,
            from_date: input.from_date,
            to_date: input.to_date,
            ...(input.employee_id !== undefined && { employee_id: input.employee_id }),
            ...(input.member_id !== undefined && { member_id: input.member_id }),
            ...(input.half_days !== undefined && { half_days: input.half_days }),
            ...(input.note !== undefined && { note: input.note })
        };

        const response = await nango.post({
            // https://workable.readme.io/reference/timeoffrequests.md
            endpoint: '/spi/v3/timeoff/requests',
            data: requestBody,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received an empty or invalid response from the Workable API.'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            ...(providerData.state !== undefined && { state: providerData.state }),
            ...(providerData.category !== undefined && { category: providerData.category }),
            ...(providerData.category_id !== undefined && { category_id: providerData.category_id }),
            ...(providerData.from_date !== undefined && { from_date: providerData.from_date }),
            ...(providerData.to_date !== undefined && { to_date: providerData.to_date }),
            ...(providerData.employee_id !== undefined && { employee_id: providerData.employee_id }),
            ...(providerData.member_id !== undefined && { member_id: providerData.member_id }),
            ...(providerData.half_days !== undefined && { half_days: providerData.half_days }),
            ...(providerData.note !== undefined && { note: providerData.note }),
            ...(providerData.created_at !== undefined && { created_at: providerData.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
