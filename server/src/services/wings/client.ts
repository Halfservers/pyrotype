import type { WingsServerDetails, WingsResourceUsage, WingsFileObject, PowerSignal, WingsWebsocketAuth } from './types'

export function getWingsClient(node: { fqdn: string; scheme: string; daemonListen: number; daemonToken: string }): WingsClient {
  const baseUrl = `${node.scheme}://${node.fqdn}:${node.daemonListen}`
  return new WingsClient(baseUrl, node.daemonToken)
}

export class WingsClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl
    this.token = token
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      ...(init?.headers as Record<string, string> || {}),
    }
    if (init?.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
    const res = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Wings API error ${res.status}: ${text}`)
    }
    if (res.status === 204) return undefined as T
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return res.json() as Promise<T>
    }
    return res.text() as unknown as T
  }

  // Server
  async getServerDetails(uuid: string): Promise<WingsServerDetails> {
    return this.request(`/api/servers/${uuid}`)
  }

  async getResourceUsage(uuid: string): Promise<WingsResourceUsage> {
    return this.request(`/api/servers/${uuid}/resources`)
  }

  async sendPowerAction(uuid: string, signal: PowerSignal): Promise<void> {
    await this.request(`/api/servers/${uuid}/power`, {
      method: 'POST',
      body: JSON.stringify({ action: signal }),
    })
  }

  async sendCommand(uuid: string, command: string): Promise<void> {
    await this.request(`/api/servers/${uuid}/commands`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    })
  }

  // Files
  async listDirectory(uuid: string, directory: string): Promise<WingsFileObject[]> {
    return this.request(`/api/servers/${uuid}/files/list-directory?directory=${encodeURIComponent(directory)}`)
  }

  async getFileContents(uuid: string, file: string): Promise<string> {
    return this.request(`/api/servers/${uuid}/files/contents?file=${encodeURIComponent(file)}`)
  }

  async writeFile(uuid: string, file: string, content: string): Promise<void> {
    const url = `${this.baseUrl}/api/servers/${uuid}/files/write?file=${encodeURIComponent(file)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'text/plain',
      },
      body: content,
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`Wings write error ${res.status}`)
  }

  async renameFiles(uuid: string, root: string, files: Array<{ from: string; to: string }>): Promise<void> {
    await this.request(`/api/servers/${uuid}/files/rename`, {
      method: 'PUT',
      body: JSON.stringify({ root, files }),
    })
  }

  async copyFile(uuid: string, location: string): Promise<void> {
    await this.request(`/api/servers/${uuid}/files/copy`, {
      method: 'POST',
      body: JSON.stringify({ location }),
    })
  }

  async deleteFiles(uuid: string, root: string, files: string[]): Promise<void> {
    await this.request(`/api/servers/${uuid}/files/delete`, {
      method: 'POST',
      body: JSON.stringify({ root, files }),
    })
  }

  async compressFiles(uuid: string, root: string, files: string[]): Promise<WingsFileObject> {
    return this.request(`/api/servers/${uuid}/files/compress`, {
      method: 'POST',
      body: JSON.stringify({ root, files }),
    })
  }

  async decompressFile(uuid: string, root: string, file: string): Promise<void> {
    await this.request(`/api/servers/${uuid}/files/decompress`, {
      method: 'POST',
      body: JSON.stringify({ root, file }),
    })
  }

  async createDirectory(uuid: string, root: string, name: string): Promise<void> {
    await this.request(`/api/servers/${uuid}/files/create-directory`, {
      method: 'POST',
      body: JSON.stringify({ root, name }),
    })
  }

  async chmodFiles(uuid: string, root: string, files: Array<{ file: string; mode: number }>): Promise<void> {
    await this.request(`/api/servers/${uuid}/files/chmod`, {
      method: 'POST',
      body: JSON.stringify({ root, files }),
    })
  }

  async pullFile(uuid: string, url: string, directory?: string): Promise<void> {
    await this.request(`/api/servers/${uuid}/files/pull`, {
      method: 'POST',
      body: JSON.stringify({ url, directory }),
    })
  }

  async getUploadUrl(uuid: string): Promise<string> {
    const data = await this.request<{ url: string }>(`/api/servers/${uuid}/files/upload`)
    return data.url
  }

  async getFileDownloadUrl(uuid: string, file: string): Promise<string> {
    const data = await this.request<{ url: string }>(`/api/servers/${uuid}/files/download?file=${encodeURIComponent(file)}`)
    return data.url
  }

  // Backups
  async createBackup(uuid: string, backup: { adapter: string; uuid: string; ignore: string }): Promise<void> {
    await this.request(`/api/servers/${uuid}/backup`, {
      method: 'POST',
      body: JSON.stringify(backup),
    })
  }

  async restoreBackup(uuid: string, backupUuid: string, adapter: string, truncate: boolean): Promise<void> {
    await this.request(`/api/servers/${uuid}/backup/${backupUuid}/restore`, {
      method: 'POST',
      body: JSON.stringify({ adapter, truncate_directory: truncate }),
    })
  }

  async deleteBackup(uuid: string, backupUuid: string): Promise<void> {
    await this.request(`/api/servers/${uuid}/backup/${backupUuid}`, { method: 'DELETE' })
  }

  // Websocket
  async getWebsocketToken(uuid: string): Promise<WingsWebsocketAuth> {
    return this.request(`/api/servers/${uuid}/ws`)
  }

  // Server management
  async reinstallServer(uuid: string): Promise<void> {
    await this.request(`/api/servers/${uuid}/install`, { method: 'POST' })
  }

  async syncServerConfiguration(uuid: string): Promise<void> {
    await this.request(`/api/servers/${uuid}/sync`, { method: 'POST' })
  }
}
