interface Version {
    number: number;
    message: string;
    minorEdit: boolean;
    authorId: string;
    createdAt: string; // ISO date string
}

interface Links {
    editui: string;
    webui: string;
    edituiv2: string;
    tinyui: string;
}

export interface PageResponse {
    parentType: string | null;
    parentId: string | null;
    ownerId: string;
    lastOwnerId: string | null;
    createdAt: string;
    authorId: string;
    position: number;
    version: Version;
    body?: {
        storage?: {
            value?: string;
            representation?: string;
        };
        atlas_doc_format?: string;
    };
    status: string;
    title: string;
    spaceId: string;
    id: string;
    _links: Links;
}
