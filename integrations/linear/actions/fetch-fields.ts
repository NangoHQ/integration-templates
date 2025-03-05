// @ts-nocheck
import type { NangoAction, ProxyConfiguration, Entity, FieldResponse } from '../../models.js';
import { entitySchema } from '../schema.zod.js';

interface LinearFieldResponse {
    fields: {
        name: string;
        type: {
            kind: string;
            name: string;
            ofType: {
                kind: string;
                name: string;
                ofType?: {
                    kind: string;
                    name: string;
                    ofType?: {
                        kind: string;
                        name: string;
                        ofType?: {
                            kind: string;
                            name: string;
                        };
                    };
                };
            };
        };
    }[];
}

export default async function runAction(nango: NangoAction, input: Entity): Promise<FieldResponse> {
    const parsedInput = entitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to fetch fields: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to fetch fields'
        });
    }

    const { name } = parsedInput.data;

    const query = `
        query {
            ${name.toLowerCase()}: __type(name: "${name}") {
                fields {
                    name
                    type {
                        kind
                        name
                        ofType {
                            kind
                            name
                            ofType {
                                kind
                                name
                                ofType {
                                    kind
                                    name
                                    ofType {
                                        kind
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const config: ProxyConfiguration = {
        endpoint: '/graphql',
        data: { query },
        retries: 10
    };

    const response = await nango.post<{ data: Record<string, LinearFieldResponse> }>(config);

    const { data } = response.data;

    const fieldData = data[name.toLowerCase()];

    if (!fieldData) {
        throw new nango.ActionError({
            message: `No fields found for entity ${name}`
        });
    }
    console.log(JSON.stringify(fieldData, null, 2));

    const resolveType = (type: any): any => {
        if (!type) return {};
        if (type.name) {
            switch (type.name) {
                case 'String':
                    return { type: 'string' };
                case 'Int':
                case 'Float':
                    return { type: 'number' };
                case 'Boolean':
                    return { type: 'boolean' };
                case 'ID':
                    return { type: 'string', format: 'uuid' };
                default:
                    return { $ref: `#/definitions/${type.name}` };
            }
        }
        return resolveType(type.ofType);
    };

    const properties = fieldData.fields.reduce(
        (acc, field) => {
            acc[field.name] = resolveType(field.type);
            return acc;
        },
        {} as Record<string, any>
    );

    const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties,
        required: fieldData.fields.filter((field) => field.type.kind === 'NON_NULL').map((field) => field.name),
        definitions: {} // Populate this if you have nested types
    };

    return {
        fields: schema
    } as FieldResponse;
}
/*
 *
 function mapTypeToJSONSchema(type: any): any {
  if (!type) return {};
  
  switch (type.kind) {
    case "SCALAR":
      return mapScalarType(type.name);
    case "NON_NULL":
      return mapTypeToJSONSchema(type.ofType);
    case "LIST":
      return {
        type: "array",
        items: mapTypeToJSONSchema(type.ofType)
      };
    case "OBJECT":
      return { $ref: `#/definitions/${type.name}` };
    case "ENUM":
      return { type: "string", enum: [] }; // Enum values should be filled in dynamically
    default:
      return { type: "string" }; // Fallback for unknown types
  }
}

// Helper to map scalar types
function mapScalarType(name: string): any {
  switch (name) {
    case "String":
      return { type: "string" };
    case "Int":
      return { type: "integer" };
    case "Float":
      return { type: "number" };
    case "Boolean":
      return { type: "boolean" };
    case "DateTime":
      return { type: "string", format: "date-time" };
    case "ID":
      return { type: "string", format: "uuid" };
    default:
      return { type: "string" }; // Default fallback
  }
}

// Main function to convert GraphQL fields to JSON Schema
function generateFieldJSONSchema(fields: any[]): any {
  const properties = fields.reduce((acc, field) => {
    acc[field.name] = mapTypeToJSONSchema(field.type);
    return acc;
  }, {});

  const requiredFields = fields
    .filter((field) => field.type.kind === "NON_NULL")
    .map((field) => field.name);

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties,
    required: requiredFields,
    additionalProperties: false,
    definitions: {} // Add definitions if needed for nested types
  };
}
 */
