import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Project ID. Example: 210311946')
});

const ProviderResponseSchema = z.object({
    value: z
        .object({
            id: z.number(),
            name: z.string(),
            number: z.string().optional().nullable(),
            description: z.string().optional().nullable(),
            startDate: z.string().optional().nullable(),
            endDate: z.string().optional().nullable(),
            projectManager: z
                .object({
                    id: z.number().optional().nullable()
                })
                .optional()
                .nullable(),
            isClosed: z.boolean().optional().nullable(),
            isFixedPrice: z.boolean().optional().nullable(),
            isInternal: z.boolean().optional().nullable(),
            isOffer: z.boolean().optional().nullable(),
            displayName: z.string().optional().nullable(),
            url: z.string().optional().nullable()
        })
        .passthrough()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    number: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    projectManagerId: z.number().optional(),
    isClosed: z.boolean().optional(),
    isFixedPrice: z.boolean().optional(),
    isInternal: z.boolean().optional(),
    isOffer: z.boolean().optional(),
    displayName: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/project/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const project = providerResponse.value;

        return {
            id: project.id,
            name: project.name,
            ...(project.number !== undefined && project.number !== null && { number: project.number }),
            ...(project.description !== undefined && project.description !== null && { description: project.description }),
            ...(project.startDate !== undefined && project.startDate !== null && { startDate: project.startDate }),
            ...(project.endDate !== undefined && project.endDate !== null && { endDate: project.endDate }),
            ...(project.projectManager !== undefined &&
                project.projectManager !== null &&
                project.projectManager.id !== undefined &&
                project.projectManager.id !== null && { projectManagerId: project.projectManager.id }),
            ...(project.isClosed !== undefined && project.isClosed !== null && { isClosed: project.isClosed }),
            ...(project.isFixedPrice !== undefined && project.isFixedPrice !== null && { isFixedPrice: project.isFixedPrice }),
            ...(project.isInternal !== undefined && project.isInternal !== null && { isInternal: project.isInternal }),
            ...(project.isOffer !== undefined && project.isOffer !== null && { isOffer: project.isOffer }),
            ...(project.displayName !== undefined && project.displayName !== null && { displayName: project.displayName }),
            ...(project.url !== undefined && project.url !== null && { url: project.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
