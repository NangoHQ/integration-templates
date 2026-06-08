import { createSync } from 'nango';
import { z } from 'zod';

const ProviderFileSchema = z.object({
    id: z.number(),
    name: z.string(),
    originalFileName: z.string().optional(),
    size: z.string().optional(),
    dateCreated: z.string().optional(),
    createdBy: z.string().nullable().optional(),
    shareWithEmployees: z.string().optional(),
    canRenameFile: z.string().optional(),
    canDeleteFile: z.string().optional()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    canUploadFiles: z.string().optional(),
    files: z.array(ProviderFileSchema).optional()
});

const ProviderResponseSchema = z.object({
    categories: z.array(ProviderCategorySchema).optional()
});

const CompanyFileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    original_file_name: z.string().optional(),
    size: z.string().optional(),
    date_created: z.string().optional(),
    created_by: z.string().optional(),
    share_with_employees: z.string().optional(),
    can_rename_file: z.string().optional(),
    can_delete_file: z.string().optional(),
    category_id: z.string().optional(),
    category_name: z.string().optional()
});

const sync = createSync({
    description: 'Sync company files from BambooHR',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/company-files' }],
    models: {
        CompanyFile: CompanyFileSchema
    },

    exec: async (nango) => {
        // https://documentation.bamboohr.com/reference/list-company-files
        const response = await nango.get({
            endpoint: '/v1/files/view',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const categories = parsed.categories ?? [];

        const files = categories.flatMap((category) => {
            const categoryFiles = category.files ?? [];
            return categoryFiles.map((file) => ({
                id: String(file.id),
                name: file.name,
                ...(file.originalFileName != null && { original_file_name: file.originalFileName }),
                ...(file.size != null && { size: file.size }),
                ...(file.dateCreated != null && { date_created: file.dateCreated }),
                ...(file.createdBy != null && { created_by: file.createdBy }),
                ...(file.shareWithEmployees != null && { share_with_employees: file.shareWithEmployees }),
                ...(file.canRenameFile != null && { can_rename_file: file.canRenameFile }),
                ...(file.canDeleteFile != null && { can_delete_file: file.canDeleteFile }),
                category_id: String(category.id),
                category_name: category.name
            }));
        });

        await nango.trackDeletesStart('CompanyFile');
        await nango.batchSave(files, 'CompanyFile');
        await nango.trackDeletesEnd('CompanyFile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
