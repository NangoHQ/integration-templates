export interface BoxUser {
    id: string;
    type: 'user';
    address: string;
    avatar_url: string;
    can_see_managed_users: boolean;
    created_at: string;
    enterprise: {
        id: string;
        type: 'enterprise';
        name: string;
    };
    external_app_user_id: string;
    hostname: string;
    is_exempt_from_device_limits: boolean;
    is_exempt_from_login_verification: boolean;
    is_external_collab_restricted: boolean;
    is_platform_access_only: boolean;
    is_sync_enabled: boolean;
    job_title: string;
    language: string;
    login: string;
    max_upload_size: number;
    modified_at: string;
    name: string;
    my_tags: string[];
    notification_email: {
        email: string;
        is_confirmed: boolean;
    };
    phone: string;
    role: 'admin' | 'coadmin' | 'user';
    space_amount: number;
    space_used: number;
    status: 'active' | 'inactive' | 'cannot_delete_edit' | 'cannot_delete_edit_upload';
    timezone: string;
    tracking_codes?: TrackingCode[];
}

export interface TrackingCode {
    type: 'tracking_code';
    name: string;
    value: string;
}

export interface BoxFile {
    id: string;
    type: string;
    allowed_invitee_roles: string[];
    classification: {
        color: string;
        definition: string;
        name: string;
    };
    comment_count: number;
    content_created_at: string;
    content_modified_at: string;
    created_at: string;
    created_by: User;
    description: string;
    disposition_at: string;
    etag: string;
    expires_at: string;
    expiring_embed_link: {
        access_token: string;
        expires_in: number;
        restricted_to: {
            object: {
                etag: string;
                id: string;
                type: string;
                name: string;
                sequence_id: string;
            };
            scope: string;
        }[];
        token_type: string;
        url: string;
    };
    extension: string;
    file_version: {
        id: string;
        type: string;
        sha1: string;
    };
    has_collaborations: boolean;
    is_accessible_via_shared_link: boolean;
    is_associated_with_app_item: boolean;
    is_externally_owned: boolean;
    is_package: boolean;
    item_status: string;
    lock: {
        id: string;
        type: string;
        app_type: string;
        created_at: string;
        created_by: User;
        expired_at: string;
        is_download_prevented: boolean;
    };
    metadata: Record<
        string,
        Record<
            string,
            {
                $canEdit: boolean;
                $id: string;
                $parent: string;
                $scope: string;
                $template: string;
                $type: string;
                $typeVersion: number;
                $version: number;
            }
        >
    >;
    modified_at: string;
    modified_by: User;
    name: string;
    owned_by: User;
    parent: {
        id: string;
        type: string;
        etag: string;
        name: string;
        sequence_id: string;
    };
    path_collection: {
        entries: {
            etag: string;
            id: string;
            type: string;
            name: string;
            sequence_id: string;
        }[];
        total_count: number;
    };
    permissions: {
        can_annotate: boolean;
        can_comment: boolean;
        can_delete: boolean;
        can_download: boolean;
        can_invite_collaborator: boolean;
        can_preview: boolean;
        can_rename: boolean;
        can_set_share_access: boolean;
        can_share: boolean;
        can_upload: boolean;
        can_view_annotations_all: boolean;
        can_view_annotations_self: boolean;
    };
    purged_at: string;
    representations: {
        entries: {
            content: {
                url_template: string;
            };
            info: {
                url: string;
            };
            properties: {
                dimensions: string;
                paged: string;
                thumb: string;
            };
            representation: string;
            status: {
                state: string;
            };
        }[];
    };
    sequence_id: string;
    sha1: string;
    shared_link: {
        access: string;
        download_count: number;
        download_url: string;
        effective_access: string;
        effective_permission: string;
        is_password_enabled: boolean;
        permissions: {
            can_download: boolean;
            can_edit: boolean;
            can_preview: boolean;
        };
        preview_count: number;
        unshared_at: string;
        url: string;
        vanity_name: string;
        vanity_url: string;
    };
    shared_link_permission_options: string[];
    size: number;
    tags: string[];
    trashed_at: string;
    uploader_display_name: string;
    version_number: string;
    watermark_info: {
        is_watermarked: boolean;
    };
}

interface User {
    id: string;
    type: string;
    login: string;
    name: string;
}

export interface BoxFileIdentifier {
    fieldId: string;
}

export interface BoxItem {
    id: string;
    type: 'folder' | 'file' | 'web_link';
    name: string;
}

export interface ListFolderItemsResponse {
    entries: {
        etag: string;
        id: string;
        type: string;
        file_version: {
            id: string;
            type: string;
            sha1: string;
        };
        name: string;
        sequence_id: string;
        sha1: string;
        content_created_at: string;
        content_modified_at: string;
        created_at: string;
        created_by: {
            id: string;
            type: string;
            login: string;
            name: string;
        };
        description: string;
        item_status: string;
        modified_at: string;
        modified_by: {
            id: string;
            type: string;
            login: string;
            name: string;
        };
        owned_by: {
            id: string;
            type: string;
            login: string;
            name: string;
        };
        parent: {
            etag: string;
            id: string;
            type: string;
            name: string;
            sequence_id: string;
        };
        path_collection: {
            entries: {
                etag: string;
                id: string;
                type: string;
                name: string;
                sequence_id: string;
            }[];
            total_count: number;
        };
        purged_at: string;
        shared_link: {
            access: string;
            download_count: number;
            download_url: string;
            effective_access: string;
            effective_permission: string;
            is_password_enabled: boolean;
            permissions: {
                can_download: boolean;
                can_edit: boolean;
                can_preview: boolean;
            };
            preview_count: number;
            unshared_at: string;
            url: string;
            vanity_name: string;
            vanity_url: string;
        };
        size: number;
        trashed_at: string;
        allowed_invitee_roles: string[];
        classification: {
            color: string;
            definition: string;
            name: string;
        };
        comment_count: number;
        disposition_at: string;
        expires_at: string;
        expiring_embed_link: {
            access_token: string;
            expires_in: number;
            restricted_to: {
                object: {
                    etag: string;
                    id: string;
                    type: string;
                    name: string;
                    sequence_id: string;
                };
                scope: string;
            }[];
            token_type: string;
            url: string;
        };
        extension: string;
        has_collaborations: boolean;
        is_accessible_via_shared_link: boolean;
        is_associated_with_app_item: boolean;
        is_externally_owned: boolean;
        is_package: boolean;
        lock: {
            app_type: string;
            created_at: string;
            created_by: {
                id: string;
                type: string;
                login: string;
                name: string;
            };
            expired_at: string;
            id: string;
            is_download_prevented: boolean;
            type: string;
        };
        metadata: Record<
            string,
            Record<
                string,
                {
                    $canEdit: boolean;
                    $id: string;
                    $parent: string;
                    $scope: string;
                    $template: string;
                    $type: string;
                    $typeVersion: number;
                    $version: number;
                }
            >
        >;
        permissions: {
            can_delete: boolean;
            can_download: boolean;
            can_invite_collaborator: boolean;
            can_rename: boolean;
            can_set_share_access: boolean;
            can_share: boolean;
            can_annotate: boolean;
            can_comment: boolean;
            can_preview: boolean;
            can_upload: boolean;
            can_view_annotations_all: boolean;
            can_view_annotations_self: boolean;
        };
        representations: {
            entries: {
                content: {
                    url_template: string;
                };
                info: {
                    url: string;
                };
                properties: {
                    dimensions: string;
                    paged: string;
                    thumb: string;
                };
                representation: string;
                status: {
                    state: string;
                };
            }[];
        };
        shared_link_permission_options: string[];
        tags: string[];
        uploader_display_name: string;
        version_number: string;
        watermark_info: {
            is_watermarked: boolean;
        };
    }[];
    limit: number;
    next_marker: string;
    offset: number;
    order: {
        by: string;
        direction: string;
    }[];
    prev_marker: string;
    total_count: number;
}
