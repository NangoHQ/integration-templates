import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderFileSchema = z
    .object({
        id: z.union([z.number(), z.string()]),
        name: z.string().optional(),
        fileUrl: z.string().optional(),
        originalFileName: z.string().optional(),
        size: z.string().optional(),
        dateCreated: z.string().optional(),
        dateUpdated: z.string().optional(),
        createdBy: z.string().nullable().optional(),
        shareWithEmployees: z.string().optional(),
        shareWithCompany: z.string().optional(),
        employeeAccess: z.string().optional(),
        canRenameFile: z.string().optional(),
        canDeleteFile: z.string().optional()
    })
    .passthrough();

const ProviderCategorySchema = z
    .object({
        id: z.union([z.number(), z.string()]),
        name: z.string().optional(),
        canUploadFiles: z.string().optional(),
        files: z.array(ProviderFileSchema).optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        categories: z.array(ProviderCategorySchema).optional()
    })
    .passthrough();

const FileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    fileUrl: z.string().optional(),
    originalFileName: z.string().optional(),
    size: z.string().optional(),
    dateCreated: z.string().optional(),
    dateUpdated: z.string().optional(),
    createdBy: z.string().nullable().optional(),
    shareWithEmployees: z.string().optional(),
    shareWithCompany: z.string().optional(),
    employeeAccess: z.string().optional(),
    canRenameFile: z.string().optional(),
    canDeleteFile: z.string().optional()
});

const CategorySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    canUploadFiles: z.string().optional(),
    files: z.array(FileSchema).optional()
});

const OutputSchema = z.object({
    categories: z.array(CategorySchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List company files from BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-company-files'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-company-files
            endpoint: '/v1/files/view',
            headers: {
                Accept: 'application/json'
            },
            params: {
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const categories = providerData.categories ?? [];

        return {
            categories: categories.map((category) => ({
                id: String(category.id),
                ...(category.name !== undefined && { name: category.name }),
                ...(category.canUploadFiles !== undefined && { canUploadFiles: category.canUploadFiles }),
                files:
                    category.files?.map((file) => ({
                        id: String(file.id),
                        ...(file.name !== undefined && { name: file.name }),
                        ...(file.fileUrl !== undefined && { fileUrl: file.fileUrl }),
                        ...(file.originalFileName !== undefined && { originalFileName: file.originalFileName }),
                        ...(file.size !== undefined && { size: file.size }),
                        ...(file.dateCreated !== undefined && { dateCreated: file.dateCreated }),
                        ...(file.dateUpdated !== undefined && { dateUpdated: file.dateUpdated }),
                        ...(file.createdBy !== undefined && { createdBy: file.createdBy }),
                        ...(file.shareWithEmployees !== undefined && { shareWithEmployees: file.shareWithEmployees }),
                        ...(file.shareWithCompany !== undefined && { shareWithCompany: file.shareWithCompany }),
                        ...(file.employeeAccess !== undefined && { employeeAccess: file.employeeAccess }),
                        ...(file.canRenameFile !== undefined && { canRenameFile: file.canRenameFile }),
                        ...(file.canDeleteFile !== undefined && { canDeleteFile: file.canDeleteFile })
                    })) ?? []
            })),
            ...(typeof providerData['nextCursor'] === 'string' && { nextCursor: providerData['nextCursor'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
