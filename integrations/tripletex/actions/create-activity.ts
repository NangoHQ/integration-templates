import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).max(255).describe('Activity name. Example: "Consulting hours"'),
    activityType: z
        .string()
        .describe('Activity type. Example: "GENERAL_ACTIVITY". Enum: GENERAL_ACTIVITY, PROJECT_GENERAL_ACTIVITY, PROJECT_SPECIFIC_ACTIVITY, TASK'),
    description: z.string().max(16777215).optional().describe('Activity description.'),
    number: z.string().max(100).optional().describe('Activity number.'),
    isChargeable: z.boolean().optional().describe('Whether the activity is chargeable.'),
    rate: z.number().optional().describe('Hourly rate for the activity.'),
    costPercentage: z.number().optional().describe('Cost percentage for the activity.')
});

const ProviderActivitySchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string().optional(),
    number: z.string().optional(),
    description: z.string().optional(),
    activityType: z.string().optional(),
    isProjectActivity: z.boolean().optional(),
    isGeneral: z.boolean().optional(),
    isTask: z.boolean().optional(),
    isDisabled: z.boolean().optional(),
    isChargeable: z.boolean().optional(),
    rate: z.number().optional(),
    costPercentage: z.number().optional(),
    displayName: z.string().optional(),
    deletable: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Activity ID. Example: 4598371'),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string().optional(),
    number: z.string().optional(),
    description: z.string().optional(),
    activityType: z.string().optional(),
    isProjectActivity: z.boolean().optional(),
    isGeneral: z.boolean().optional(),
    isTask: z.boolean().optional(),
    isDisabled: z.boolean().optional(),
    isChargeable: z.boolean().optional(),
    rate: z.number().optional(),
    costPercentage: z.number().optional(),
    displayName: z.string().optional(),
    deletable: z.boolean().optional()
});

const action = createAction({
    description: 'Create an activity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.post({
            endpoint: 'v2/activity',
            data: {
                name: input.name,
                activityType: input.activityType,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.number !== undefined && { number: input.number }),
                ...(input.isChargeable !== undefined && { isChargeable: input.isChargeable }),
                ...(input.rate !== undefined && { rate: input.rate }),
                ...(input.costPercentage !== undefined && { costPercentage: input.costPercentage })
            },
            retries: 3
        });

        const wrapper = z
            .object({
                value: ProviderActivitySchema
            })
            .parse(response.data);

        const activity = wrapper.value;

        return {
            id: activity.id,
            ...(activity.version !== undefined && { version: activity.version }),
            ...(activity.url !== undefined && { url: activity.url }),
            ...(activity.name !== undefined && { name: activity.name }),
            ...(activity.number !== undefined && { number: activity.number }),
            ...(activity.description !== undefined && { description: activity.description }),
            ...(activity.activityType !== undefined && { activityType: activity.activityType }),
            ...(activity.isProjectActivity !== undefined && { isProjectActivity: activity.isProjectActivity }),
            ...(activity.isGeneral !== undefined && { isGeneral: activity.isGeneral }),
            ...(activity.isTask !== undefined && { isTask: activity.isTask }),
            ...(activity.isDisabled !== undefined && { isDisabled: activity.isDisabled }),
            ...(activity.isChargeable !== undefined && { isChargeable: activity.isChargeable }),
            ...(activity.rate !== undefined && { rate: activity.rate }),
            ...(activity.costPercentage !== undefined && { costPercentage: activity.costPercentage }),
            ...(activity.displayName !== undefined && { displayName: activity.displayName }),
            ...(activity.deletable !== undefined && { deletable: activity.deletable })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
