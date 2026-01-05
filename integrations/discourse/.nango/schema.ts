export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_discourse_activeusers {
};

export interface SyncMetadata_discourse_categories {
};

export interface Category {
  id: string;
  url: string;
  name: string;
  description: string;
};

export interface ActionInput_discourse_createcategory {
  name: string;
  color?: string | undefined;
  text_color?: string | undefined;
  parent_category_id?: string | undefined;
  slug?: string | undefined;
  search_priority?: string | undefined;
};

export interface ActionOutput_discourse_createcategory {
  id: string;
  name: string;
  color: string;
  description: string | null;
  slug: string;
};

export interface ActionInput_discourse_createtopic {
  title: string;
  category: number;
  raw: string;
};

export interface ActionOutput_discourse_createtopic {
  id: string;
  name: string;
  content: string;
};

export interface ActionInput_discourse_updatetopicstatus {
  id: string;
  status: 'closed' | 'pinned' | 'pinned_globally' | 'archived' | 'visible';
  enabled?: any | undefined | any | undefined;
  until: string;
};

export interface ActionOutput_discourse_updatetopicstatus {
  success: string;
  result: string;
};
