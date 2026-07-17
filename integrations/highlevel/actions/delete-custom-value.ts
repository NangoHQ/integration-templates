import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The custom value ID to delete. Example: "oGYzvcuF1CYQcbRO2Mnr"')
});

const OutputSchema = z.object({
    succeeded: z.boolean()
});

const ProviderDeleteResponseSchema = z.object({
    succeeded: z.boolean()
});

const MetadataSchema = z.object({
    locationId: z.string()
});

const action = createAction({
    description: 'Delete a custom value in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations/customValues.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'locationId is required in metadata.'
            });
        }
        const locationId = parsedMetadata.data.locationId;

        const response = await nango.delete({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/locations/${encodeURIComponent(locationId)}/customValues/${encodeURIComponent(input.id)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 10
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);
        return {
            succeeded: providerResponse.succeeded
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
