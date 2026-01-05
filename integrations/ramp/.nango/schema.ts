export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_ramp_users {
};

export interface ActionInput_ramp_createuser {
  firstName: string;
  lastName: string;
  email: string;
  role?: string | undefined;
  departmentId?: string | undefined;
  directManagerId?: string | undefined;
  idempotencyKey?: string | undefined;
  locationId?: string | undefined;
};

export interface ActionOutput_ramp_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_ramp_disableuser {
  id: string;
};

export interface ActionOutput_ramp_disableuser {
  success: boolean;
};
