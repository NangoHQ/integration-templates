import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the Wrike task to update. Example: "MAAAAAEQ_HoO".'),
        customFieldId: z.string().describe('ID of the custom field definition whose value should be set. Example: "IEAG5DAKJUANPFGZ".'),
        value: z
            .union([z.string(), z.number()])
            .nullable()
            .describe(
                'Value to store for the custom field. Must match the field type (for a DropDown field it must exactly match one of the configured options, case-sensitive; numeric, currency, percentage and duration fields are still sent as strings). Pass null to clear the value.'
            )
    })
    .describe('Input for setting or clearing a custom field value on a Wrike task.');

const ProviderCustomFieldSchema = z.object({
    id: z.string(),
    value: z.string()
});

const ProviderTaskSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            customFields: z.array(ProviderCustomFieldSchema).nullable().optional()
        })
    )
});

const CustomFieldValueSchema = z.object({
    id: z.string().describe('Custom field definition ID.'),
    value: z.string().describe('Value stored on the task for this custom field.')
});

const OutputSchema = z
    .object({
        taskId: z.string().describe('ID of the task that was updated.'),
        customFieldId: z.string().describe('ID of the custom field that was targeted.'),
        value: z.string().nullable().describe('Value now stored on the task for the custom field; null when the field is not set after the update.'),
        customFields: z.array(CustomFieldValueSchema).describe('All custom field values set on the task after the update.')
    })
    .describe('Result of setting or clearing a custom field value, including the custom fields set on the task afterward.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the task back to confirm persistence, writes the custom field value, and passing null clears (destroys) the stored value.
 * @pitfalls: Setting a Space-scoped custom field on a task outside that field's space returns success from Wrike but silently stores nothing, and this action throws instead of reporting a false success; DropDown values must exactly match one of the field's configured options (case-sensitive), and passing null clears the value.
 */
const action = createAction({
    description: "Set (or clear) a custom field's value on a specific task.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestedValue = input.value === null ? null : String(input.value);

        // https://developers.wrike.com/reference/puttaskssingle
        await nango.put({
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}`,
            data: {
                customFields: [
                    {
                        id: input.customFieldId,
                        value: requestedValue
                    }
                ]
            },
            retries: 3
        });

        // https://developers.wrike.com/reference/gettasksmulti
        const response = await nango.get({
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}`,
            retries: 3
        });

        const parsed = ProviderTaskSchema.parse(response.data);
        const task = parsed.data[0];
        const customFields = task?.customFields ?? [];
        const applied = customFields.find((field) => field.id === input.customFieldId);

        if (requestedValue === null) {
            if (applied) {
                throw new nango.ActionError({
                    type: 'clear_failed',
                    message: `Wrike accepted the request but custom field ${input.customFieldId} still has a value on task ${input.taskId}.`,
                    value: applied.value
                });
            }
        } else if (!applied) {
            throw new nango.ActionError({
                type: 'value_not_persisted',
                message: `Wrike accepted the request but did not persist a value for custom field ${input.customFieldId} on task ${input.taskId}. A common cause is setting a Space-scoped custom field on a task outside that field's space.`,
                customFieldId: input.customFieldId,
                value: requestedValue
            });
        }

        return {
            taskId: input.taskId,
            customFieldId: input.customFieldId,
            value: applied ? applied.value : null,
            customFields: customFields.map((field) => ({
                id: field.id,
                value: field.value
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
