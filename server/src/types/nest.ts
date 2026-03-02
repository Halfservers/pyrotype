export interface NestAttributes {
  id: number;
  uuid: string;
  author: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EggAttributes {
  id: number;
  uuid: string;
  nestId: number;
  name: string;
  description: string | null;
  author: string;
  dockerImage: string;
  dockerImages: Record<string, string>;
  startup: string;
  createdAt: string;
  updatedAt: string;
}

export interface EggVariableAttributes {
  id: number;
  eggId: number;
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  userViewable: boolean;
  userEditable: boolean;
  rules: string;
}
