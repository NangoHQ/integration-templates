export interface ActionInput_lattice_scim_createuser {
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionOutput_lattice_scim_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_lattice_scim_disableuser {
  id: string;
};

export interface ActionOutput_lattice_scim_disableuser {
  success: boolean;
};
