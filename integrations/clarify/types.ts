export interface ClarifyJsonApiResource<TAttributes = Record<string, unknown>> {
    type: string;
    id: string;
    attributes: TAttributes;
}

export interface ClarifyListAttributes {
    _id: string;
    entity: string;
    title: string;
    emoji?: string | null;
    description?: string | null;
    type?: string;
    state?: string;
    _created_at?: string;
    _updated_at?: string;
}

export interface ClarifyPaginationMeta {
    total_records: number;
    total_pages: number;
    offset: number;
    limit: number;
}

export interface ClarifyPaginatedResponse<TResource> {
    data: TResource[];
    meta: ClarifyPaginationMeta;
    links?: {
        next?: string | null;
        prev?: string | null;
    };
}

export interface ClarifySingleResourceResponse<TResource> {
    data: TResource;
}

export type ClarifyListResource = ClarifyJsonApiResource<ClarifyListAttributes>;

export type ClarifyRecordResource = ClarifyJsonApiResource<Record<string, unknown>>;
