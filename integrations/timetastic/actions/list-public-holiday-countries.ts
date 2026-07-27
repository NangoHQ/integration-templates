import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderCountrySchema = z.object({
    code: z.string(),
    name: z.string(),
    hasRegions: z.boolean()
});

const OutputSchema = z.object({
    countries: z.array(ProviderCountrySchema)
});

const action = createAction({
    description: 'List all countries with public holiday sets available.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
            endpoint: '/publicholidays/countries',
            retries: 3
        });

        const providerCountries = z.array(ProviderCountrySchema).parse(response.data);

        return {
            countries: providerCountries
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
