export interface DescribeSObjectResult {
    actionOverrides: ActionOverride[];
    activateable: boolean;
    associateEntityType: string | null;
    associateParentEntity: string | null;
    childRelationships: ChildRelationship[];
    compactLayoutable: boolean;
    createable: boolean;
    custom: boolean;
    customSetting: boolean;
    dataTranslationEnabled?: boolean;
    deepCloneable: boolean;
    defaultImplementation: string | null;
    deletable: boolean;
    deprecatedAndHidden: boolean;
    extendedBy: string | null;
    extendsInterfaces: string | null;
    feedEnabled: boolean;
    fields: SalesForceField[];
    hasSubtypes?: boolean;
    implementedBy: string;
    implementsInterfaces: string | null;
    isInterface: boolean;
    keyPrefix: string;
    label: string;
    labelPlural: string;
    layoutable: boolean;
    mergeable: boolean;
    mruEnabled: boolean;
    name: string;
    namedLayoutInfos: NamedLayoutInfo[];
    networkScopeFieldName: string | null;
    queryable: boolean;
    recordTypeInfos: RecordTypeInfo[];
    replicateable: boolean;
    retrieveable: boolean;
    searchable: boolean;
    searchLayoutable: boolean;
    supportedScopes: ScopeInfo;
    triggerable: boolean;
    undeletable: boolean;
    updateable: boolean;
    urlDetail: string;
    urlEdit: string;
    urlNew: string;
}

interface ActionOverride {
    formFactor: string;
    isAvailableInTouch: boolean;
    name: string;
    pageId: string;
    url: string | null;
}

export interface ChildRelationship {
    cascadeDelete: boolean;
    childSObject: string;
    deprecatedAndHidden: boolean;
    field: string;
    junctionIdListNames: string[];
    junctionReferenceTo: string[];
    relationshipName: string | null;
    restrictedDelete: boolean;
}

export interface SalesForceField {
    aggregatable: boolean;
    aiPredictionField?: boolean;
    cascadeDelete?: boolean;
    autoNumber: boolean;
    byteLength: number;
    calculated: boolean;
    caseSensitive: boolean;
    controllerName: string;
    createable: boolean;
    custom: boolean;
    dataTranslationEnabled: boolean;
    defaultedOnCreate: boolean;
    defaultValueFormula: string | null;
    dependentPicklist: boolean;
    deprecatedAndHidden: boolean;
    digits: number;
    displayLocationInDecimal: boolean;
    encrypted: boolean;
    extraTypeInfo: string | null;
    filterable: boolean;
    filteredLookupInfo: FilteredLookupInfo | null;
    formula?: string;
    groupable: boolean;
    highScaleNumber: boolean;
    htmlFormatted: boolean;
    idLookup: boolean;
    inlineHelpText: string | null;
    label: string;
    length: number;
    mask: string | null;
    maskType: string | null;
    name: string;
    nameField: boolean;
    namePointing: boolean;
    nillable: boolean;
    permissionable: boolean;
    picklistValues: PicklistEntry[];
    polymorphicForeignKey: boolean;
    precision: number;
    relationshipName: string | null;
    relationshipOrder: number | null;
    referenceTargetField: string | null;
    referenceTo: string[];
    restrictedPicklist: boolean;
    scale: number;
    searchPrefilterable: boolean;
    soapType: string;
    sortable: boolean;
    type: string;
    unique: boolean;
    updateable: boolean;
    writeRequiresMasterRead: boolean;
}

interface FilteredLookupInfo {
    controllingFields: string[];
    dependent: boolean;
    optionalFilter: boolean;
}
interface PicklistEntry {
    active: boolean;
    validFor: Uint8Array | null;
    defaultValue: boolean;
    label: string;
    value: string;
}

interface NamedLayoutInfo {
    name: string;
}

interface RecordTypeInfo {
    available: boolean;
    defaultRecordTypeMapping: boolean;
    developerName: string;
    master: boolean;
    name: string;
    recordTypeId: string;
}

interface ScopeInfo {
    label: string;
    name: string;
}

interface Metadata {
    description: string;
    errorConditionFormula: string;
    errorDisplayField: string;
    errorMessage: string;
    shouldEvaluateOnClient: boolean;
    urls: string;
    active: boolean;
}

interface Attributes {
    type: string;
    url: string;
}

export interface ValidationRecord {
    attributes: Attributes;
    Id: string;
    ValidationName: string;
    Metadata: Metadata;
}

export interface ValidationRuleResponse {
    size: number;
    totalSize: number;
    done: boolean;
    queryLocator: string | null;
    entityTypeName: string;
    records: ValidationRecord[];
}

export interface SalesforceAccount {
    attributes: Attributes;
    Id: string;
    Name: string;
    Website: string | null;
    Description: string | null;
    NumberOfEmployees: number | null;
    LastModifiedDate: string;
}

export interface SalesforceContact {
    attributes: Attributes;
    Id: string;
    FirstName: string;
    LastName: string;
    Email: string;
    AccountId: string | null;
    LastModifiedDate: string;
}

export interface SalesforceArticle {
    Id: string;
    Title: string;
    LastModifiedDate: string;
    [key: string]: any;
}

export interface SalesforceDeal {
    attributes: Attributes;
    Id: string;
    Name: string;
    Amount: number | null;
    StageName: string;
    AccountId: string;
    LastModifiedDate: string;
}

interface Attributes {
    type: string;
    url: string;
}

interface NamedEntity {
    attributes: Attributes;
    Name: string;
}

interface Comments {
    totalSize: number;
    done: boolean;
    records: CaseComment[];
}

export interface CaseComment {
    attributes: Attributes;
    Id: string;
    CommentBody: string;
    CreatedDate: string;
    CreatedBy: NamedEntity;
}

export interface SalesforceTicket {
    attributes: Attributes;
    Id: string;
    CaseNumber: string;
    Subject: string | null;
    AccountId: string | null;
    Account: NamedEntity | null;
    ContactId: string | null;
    Contact: NamedEntity | null;
    OwnerId: string;
    Owner: NamedEntity;
    Priority: string;
    Status: string;
    Description: string | null;
    Type: string | null;
    CreatedDate: string;
    ClosedDate: string | null;
    Origin: string | null;
    IsClosed: boolean;
    IsEscalated: boolean;
    LastModifiedDate: string;
    CaseComments: Comments | null;
}
