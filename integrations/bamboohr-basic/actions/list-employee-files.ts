import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The ID of the employee whose files are being listed. Use 0 to resolve to the employee associated with the API key.')
});

const ProviderFileSchema = z.object({
    id: z.number(),
    name: z.string(),
    originalFileName: z.string().optional(),
    size: z.number().optional(),
    dateCreated: z.string().optional(),
    createdBy: z.string().nullable().optional(),
    shareWithEmployee: z.string().optional(),
    canRenameFile: z.string().optional(),
    canDeleteFile: z.string().optional(),
    canChangeShareWithEmployeeFieldValue: z.string().optional()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    canRenameCategory: z.string().optional(),
    canDeleteCategory: z.string().optional(),
    canUploadFiles: z.string().optional(),
    displayIfEmpty: z.string().optional(),
    files: z.array(ProviderFileSchema).optional()
});

const ProviderResponseSchema = z.object({
    employee: z.object({
        id: z.number()
    }),
    categories: z.array(ProviderCategorySchema).optional()
});

const OutputSchema = z.object({
    employeeId: z.number(),
    categories: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                canRenameCategory: z.string().optional(),
                canDeleteCategory: z.string().optional(),
                canUploadFiles: z.string().optional(),
                displayIfEmpty: z.string().optional(),
                files: z
                    .array(
                        z.object({
                            id: z.number(),
                            name: z.string(),
                            originalFileName: z.string().optional(),
                            size: z.number().optional(),
                            dateCreated: z.string().optional(),
                            createdBy: z.string().nullable().optional(),
                            shareWithEmployee: z.string().optional(),
                            canRenameFile: z.string().optional(),
                            canDeleteFile: z.string().optional(),
                            canChangeShareWithEmployeeFieldValue: z.string().optional()
                        })
                    )
                    .optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'List files attached to an employee record in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['employee:file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-employee-files
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}/files/view`,
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee files not found or employee has no accessible file categories.',
                employeeId: input.employeeId
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            employeeId: providerData.employee.id,
            categories: providerData.categories?.map((category) => ({
                id: category.id,
                name: category.name,
                ...(category.canRenameCategory !== undefined && { canRenameCategory: category.canRenameCategory }),
                ...(category.canDeleteCategory !== undefined && { canDeleteCategory: category.canDeleteCategory }),
                ...(category.canUploadFiles !== undefined && { canUploadFiles: category.canUploadFiles }),
                ...(category.displayIfEmpty !== undefined && { displayIfEmpty: category.displayIfEmpty }),
                files: category.files?.map((file) => ({
                    id: file.id,
                    name: file.name,
                    ...(file.originalFileName !== undefined && { originalFileName: file.originalFileName }),
                    ...(file.size !== undefined && { size: file.size }),
                    ...(file.dateCreated !== undefined && { dateCreated: file.dateCreated }),
                    ...(file.createdBy !== undefined && { createdBy: file.createdBy }),
                    ...(file.shareWithEmployee !== undefined && { shareWithEmployee: file.shareWithEmployee }),
                    ...(file.canRenameFile !== undefined && { canRenameFile: file.canRenameFile }),
                    ...(file.canDeleteFile !== undefined && { canDeleteFile: file.canDeleteFile }),
                    ...(file.canChangeShareWithEmployeeFieldValue !== undefined && {
                        canChangeShareWithEmployeeFieldValue: file.canChangeShareWithEmployeeFieldValue
                    })
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
