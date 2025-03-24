import type { FetchFieldsInput, FetchFieldsOutput, NangoSync } from '../../models';
import { fetchFieldsInputSchema } from '../schema.zod';
import { FetchFieldsNetsuiteResponse } from '../types';

export default async function fetchData(nango: NangoSync, input: FetchFieldsInput): Promise<FetchFieldsOutput> {
    await nango.zodValidateInput({ zodSchema: fetchFieldsInputSchema, input });

    const response = await nango.get<FetchFieldsNetsuiteResponse>({
        endpoint: `/metadata-catalog/${input.name}`,
        headers: {
            accept: 'application/schema+json'
        },
        retries: 10
    });

    return {
        id: response.data.$id,
        schema: response.data.$schema,
        ...response.data
    };
}
