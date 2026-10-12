import { z } from 'zod';
import { createAction } from 'nango';

const AttributeRequestSchema = z.object({
    name: z.string().describe('The attribute name to release, e.g. "mood_note".')
});

const InputSchema = z
    .object({
        attributes: z
            .array(AttributeRequestSchema)
            .min(1)
            .max(35)
            .describe('The attributes to give up ownership of. The provider accepts a maximum of 35 per request.')
    })
    .describe('One or more attributes to release ownership of.');

const ReleasedAttributeSchema = z.object({
    name: z.string().describe('The attribute name.'),
    service: z.string().nullable().optional().describe('The service that now owns the attribute, or null when ownership became inactive.'),
    active: z.boolean().optional().describe('Whether the attribute is still active after being released.')
});

const FailedAttributeSchema = z.object({
    name: z.string().optional().describe('The attribute name that could not be released.'),
    error_code: z.string().optional().describe('Machine-readable error code, e.g. "unauthorised".'),
    error: z.string().optional().describe('Human-readable description of why the attribute could not be released.')
});

const OutputSchema = z
    .object({
        success: z.array(ReleasedAttributeSchema).describe('Attributes that were released successfully.'),
        failed: z.array(FailedAttributeSchema).describe('Attributes that could not be released, each with error details.')
    })
    .describe('The outcome of the release request, split into released and failed attributes.');

const ReleaseResponseSchema = z.object({
    success: z.array(
        z.object({
            name: z.string(),
            service: z.string().nullable().optional(),
            active: z.boolean().optional()
        })
    ),
    failed: z.array(
        z.object({
            name: z.string().optional(),
            error_code: z.string().optional(),
            error: z.string().optional()
        })
    )
});

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates provider state by giving up ownership of attributes, which disables them or passes them to another service and is difficult to reverse.
 * @pitfalls: A successful HTTP response can still contain attributes in `failed` whose ownership was not released, and a released attribute's history becomes inaccessible (but is not deleted) until it is re-acquired.
 */
const action = createAction({
    description: 'Give up ownership of one or more attributes, the closest thing to removing an attribute since the provider has no delete endpoint.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.exist.io/reference/attribute_ownership/#release-attributes
            endpoint: '/api/2/attributes/release/',
            data: input.attributes,
            // Release is idempotent: re-releasing an attribute this service no longer owns has no further effect.
            retries: 3
        });

        const parsed = ReleaseResponseSchema.parse(response.data);

        return {
            success: parsed.success.map((item) => ({
                name: item.name,
                ...(item.service != null && { service: item.service }),
                ...(item.active !== undefined && { active: item.active })
            })),
            failed: parsed.failed.map((item) => ({
                ...(item.name !== undefined && { name: item.name }),
                ...(item.error_code !== undefined && { error_code: item.error_code }),
                ...(item.error !== undefined && { error: item.error })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
