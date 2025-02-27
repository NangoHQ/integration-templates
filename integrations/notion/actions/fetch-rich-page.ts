import type { NangoAction, RichPage, RichPageInput } from '../../models';
import { richPageInputSchema } from '../schema.zod.js';
import { mapPage } from '../mappers/to-page.js';

export default async function runAction(nango: NangoAction, input: RichPageInput): Promise<RichPage> {
    nango.zodValidate({ zodSchema: richPageInputSchema, input });
