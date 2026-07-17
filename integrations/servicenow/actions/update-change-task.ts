import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Change task sys_id. Example: "74668bb9c3ca0310c5a8fc0d050131a2"'),
    state: z.string().optional().describe('State value. Example: "2"'),
    work_notes: z.string().optional().describe('Work notes to append'),
    description: z.string().optional().describe('Description'),
    assigned_to: z.string().optional().describe('Assigned user sys_id'),
    assignment_group: z.string().optional().describe('Assigned group sys_id'),
    short_description: z.string().optional().describe('Short description'),
    close_code: z.string().optional().describe('Close code'),
    close_notes: z.string().optional().describe('Close notes')
});

const ProviderResponseSchema = z.object({
    result: z
        .object({
            sys_id: z.string(),
            number: z.unknown().nullable().optional(),
            state: z.unknown().nullable().optional(),
            short_description: z.unknown().nullable().optional(),
            description: z.unknown().nullable().optional(),
            work_notes: z.unknown().nullable().optional(),
            sys_updated_on: z.unknown().nullable().optional(),
            sys_updated_by: z.unknown().nullable().optional()
        })
        .passthrough()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    state: z.string().optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    work_notes: z.string().optional(),
    sys_updated_on: z.string().optional(),
    sys_updated_by: z.string().optional()
});

const toOptionalString = (value: unknown): string | undefined => {
    return typeof value === 'string' ? value : undefined;
};

const action = createAction({
    description: 'Update change task fields (e.g. state, work notes).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/api/now/table/change_task/${encodeURIComponent(input.sys_id)}`;

        // Plain fields are safe to overwrite and safe to retry: a retried PATCH just
        // re-applies the same final value.
        const safeData = {
            ...(input.state !== undefined && { state: input.state }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
            ...(input.assignment_group !== undefined && { assignment_group: input.assignment_group }),
            ...(input.short_description !== undefined && { short_description: input.short_description }),
            ...(input.close_code !== undefined && { close_code: input.close_code }),
            ...(input.close_notes !== undefined && { close_notes: input.close_notes })
        };

        // work_notes is a ServiceNow journal field: every PATCH appends a new entry
        // rather than overwriting. It must not be retried automatically, or a transient
        // failure followed by a retry can duplicate the note.
        const journalData = {
            ...(input.work_notes !== undefined && { work_notes: input.work_notes })
        };

        let response;
        if (Object.keys(safeData).length > 0 || Object.keys(journalData).length === 0) {
            const config: ProxyConfiguration = {
                // https://developer.servicenow.com/dev.do#!/reference/api/now/table/change_task/{sys_id}
                endpoint,
                data: safeData,
                retries: 1
            };
            response = await nango.patch(config);
        }

        if (Object.keys(journalData).length > 0) {
            const journalConfig: ProxyConfiguration = {
                // https://developer.servicenow.com/dev.do#!/reference/api/now/table/change_task/{sys_id}
                endpoint,
                data: journalData,
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            };
            response = await nango.patch(journalConfig);
        }

        const parsed = ProviderResponseSchema.parse(response?.data);
        const result = parsed.result;

        const number = toOptionalString(result.number);
        const state = toOptionalString(result.state);
        const shortDescription = toOptionalString(result.short_description);
        const description = toOptionalString(result.description);
        const workNotes = toOptionalString(result.work_notes);
        const sysUpdatedOn = toOptionalString(result.sys_updated_on);
        const sysUpdatedBy = toOptionalString(result.sys_updated_by);

        return {
            sys_id: result.sys_id,
            ...(number !== undefined && { number }),
            ...(state !== undefined && { state }),
            ...(shortDescription !== undefined && { short_description: shortDescription }),
            ...(description !== undefined && { description }),
            ...(workNotes !== undefined && { work_notes: workNotes }),
            ...(sysUpdatedOn !== undefined && { sys_updated_on: sysUpdatedOn }),
            ...(sysUpdatedBy !== undefined && { sys_updated_by: sysUpdatedBy })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
