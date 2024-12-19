export interface LatticeUser {
    id: string[];
    name: string;
    description?: string;
    meta?: Meta;
    attributes?: Attributes[];
}

interface Meta {
    resourceType: string;
    location: string;
}

interface Attributes {
    name: string;
    type: string;
    multiValued: boolean;
    description: string;
    required: boolean;
    caseExact: boolean;
    mutability: string;
    returned: string;
    uniqueness: string;
    subAttributes: SubAttributes[];
}

interface SubAttributes {
    name: string;
    type: string;
    multiValued: boolean;
    description: string;
    required: boolean;
    caseExact: boolean;
    mutability: string;
    returned: string;
    uniqueness: string;
    referenceTypes: string[];
    canonicalValues: string[];
}
