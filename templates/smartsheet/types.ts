export interface SmartsheetCreatedUser {
    message: 'PARTIAL_SUCCESS' | 'SUCCESS';
    resultCode: 0 | 3;
    result: {
        id: number;
        admin: boolean;
        customWelcomeScreenViewed: Date;
        email: string;
        firstName: string;
        groupAdmin: boolean;
        lastLogin: Date;
        lastName: string;
        licensedSheetCreator: boolean;
        name: string;
        profileImage: {
            imageId: string;
            height: number;
            width: number;
        };
        resourceViewer: boolean;
        sheetCount: number;
        status: string;
    };
}

export interface SmartsheetUser {
    id: number;
    admin: boolean;
    customWelcomeScreenViewed: Date;
    email: string;
    firstName: string;
    groupAdmin: boolean;
    lastLogin: Date;
    lastName: string;
    licensedSheetCreator: boolean;
    name: string;
    profileImage: {
        imageId: string;
        height: number;
        width: number;
    };
    resourceViewer: boolean;
    sheetCount: number;
    status: string;
}

export interface SmartsheetUserListResponse {
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
    totalCount?: number;
    data?: SmartsheetUser[];
}
