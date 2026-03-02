export interface ServerDatabase {
  id: string;
  name: string;
  username: string;
  connectionString: string;
  allowConnectionsFrom: string;
  password?: string;
}
