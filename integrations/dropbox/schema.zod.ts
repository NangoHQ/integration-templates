import { z } from 'zod';

export const folderContentInputSchema = z.object({
    path: z.string().optional(),
    cursor: z.string().optional()
});
