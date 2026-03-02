import axios, { type AxiosInstance } from 'axios';
import type { WingsServerDetails, WingsResourceUsage, WingsFileObject, PowerSignal, WingsWebsocketAuth } from './types';

export function getWingsClient(node: { fqdn: string; scheme: string; daemonListen: number; daemonToken: string }): WingsClient {
  const baseUrl = `${node.scheme}://${node.fqdn}:${node.daemonListen}`;
  return new WingsClient(baseUrl, node.daemonToken);
}

export class WingsClient {
  private client: AxiosInstance;

  constructor(baseUrl: string, token: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });
  }

  // Server
  async getServerDetails(uuid: string): Promise<WingsServerDetails> {
    const { data } = await this.client.get(`/api/servers/${uuid}`);
    return data;
  }

  async getResourceUsage(uuid: string): Promise<WingsResourceUsage> {
    const { data } = await this.client.get(`/api/servers/${uuid}/resources`);
    return data;
  }

  async sendPowerAction(uuid: string, signal: PowerSignal): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/power`, { action: signal });
  }

  async sendCommand(uuid: string, command: string): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/commands`, { command });
  }

  // Files
  async listDirectory(uuid: string, directory: string): Promise<WingsFileObject[]> {
    const { data } = await this.client.get(`/api/servers/${uuid}/files/list-directory`, { params: { directory } });
    return data;
  }

  async getFileContents(uuid: string, file: string): Promise<string> {
    const { data } = await this.client.get(`/api/servers/${uuid}/files/contents`, { params: { file } });
    return data;
  }

  async writeFile(uuid: string, file: string, content: string): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/files/write`, content, {
      params: { file },
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  async renameFiles(uuid: string, root: string, files: Array<{ from: string; to: string }>): Promise<void> {
    await this.client.put(`/api/servers/${uuid}/files/rename`, { root, files });
  }

  async copyFile(uuid: string, location: string): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/files/copy`, { location });
  }

  async deleteFiles(uuid: string, root: string, files: string[]): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/files/delete`, { root, files });
  }

  async compressFiles(uuid: string, root: string, files: string[]): Promise<WingsFileObject> {
    const { data } = await this.client.post(`/api/servers/${uuid}/files/compress`, { root, files });
    return data;
  }

  async decompressFile(uuid: string, root: string, file: string): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/files/decompress`, { root, file });
  }

  async createDirectory(uuid: string, root: string, name: string): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/files/create-directory`, { root, name });
  }

  async chmodFiles(uuid: string, root: string, files: Array<{ file: string; mode: number }>): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/files/chmod`, { root, files });
  }

  async pullFile(uuid: string, url: string, directory?: string): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/files/pull`, { url, directory });
  }

  async getUploadUrl(uuid: string): Promise<string> {
    const { data } = await this.client.get(`/api/servers/${uuid}/files/upload`);
    return data.url;
  }

  async getFileDownloadUrl(uuid: string, file: string): Promise<string> {
    const { data } = await this.client.get(`/api/servers/${uuid}/files/download`, { params: { file } });
    return data.url;
  }

  // Backups
  async createBackup(uuid: string, backup: { adapter: string; uuid: string; ignore: string }): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/backup`, backup);
  }

  async restoreBackup(uuid: string, backupUuid: string, adapter: string, truncate: boolean): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/backup/${backupUuid}/restore`, { adapter, truncate_directory: truncate });
  }

  async deleteBackup(uuid: string, backupUuid: string): Promise<void> {
    await this.client.delete(`/api/servers/${uuid}/backup/${backupUuid}`);
  }

  // Websocket
  async getWebsocketToken(uuid: string): Promise<WingsWebsocketAuth> {
    const { data } = await this.client.get(`/api/servers/${uuid}/ws`);
    return data;
  }

  // Server management
  async reinstallServer(uuid: string): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/install`);
  }

  async syncServerConfiguration(uuid: string): Promise<void> {
    await this.client.post(`/api/servers/${uuid}/sync`);
  }
}
