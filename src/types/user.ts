export interface UserData {
  uuid: string;
  username: string;
  email: string;
  language: string;
  rootAdmin: boolean;
  useTotp: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SubuserPermission =
  | 'websocket.connect'
  | 'control.console'
  | 'control.start'
  | 'control.stop'
  | 'control.restart'
  | 'user.create'
  | 'user.read'
  | 'user.update'
  | 'user.delete'
  | 'file.create'
  | 'file.read'
  | 'file.update'
  | 'file.delete'
  | 'file.archive'
  | 'file.sftp'
  | 'allocation.read'
  | 'allocation.update'
  | 'startup.read'
  | 'startup.update'
  | 'database.create'
  | 'database.read'
  | 'database.update'
  | 'database.delete'
  | 'database.view_password'
  | 'schedule.create'
  | 'schedule.read'
  | 'schedule.update'
  | 'schedule.delete';

export interface Subuser {
  uuid: string;
  username: string;
  email: string;
  image: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
  permissions: SubuserPermission[];
}
