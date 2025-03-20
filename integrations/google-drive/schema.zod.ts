import { z } from 'zod';

export const folderContentInputSchema = z.object({
    folderId: z.string().optional(),
    nextPageToken: z.string().optional()
});
