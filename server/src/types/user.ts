export interface UserAttributes {
  id: number;
  externalId: string | null;
  uuid: string;
  username: string;
  email: string;
  nameFirst: string;
  nameLast: string;
  language: string;
  rootAdmin: boolean;
  useTotp: boolean;
  createdAt: string;
  updatedAt: string;
}
