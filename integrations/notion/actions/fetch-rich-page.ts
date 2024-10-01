import type { NangoAction, RichPage, RichPageInput } from '../../models';
import { richPageInputSchema } from '../../schema.zod.js';
import { mapPage } from '../mappers/to-page.js';

export default async function runAction(nango: NangoAction, input: RichPageInput): Promise<RichPage> {
    const parsedInput = richPageInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to fetch a page: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to fetch a page'
        });
    }

    const response = await nango.get({
        endpoint: `/v1/pages/${parsedInput.data.pageId}`,
        retries: 10
    });

    const page = response.data;

    const mappedPage = await mapPage(nango, page);

    return mappedPage;
}
