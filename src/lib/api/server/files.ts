import { api } from '@/lib/http';
import http from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { type FileObject, rawDataToFileObject } from '@/lib/api/transformers';

export type { FileObject } from '@/lib/api/transformers';

export const loadDirectory = async (uuid: string, directory?: string): Promise<FileObject[]> => {
  const data: any = await api.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/list`,
    { directory: directory ?? '/' },
  );
  const files = (data.data || []).map(rawDataToFileObject);
  if (files.length > 500) files.length = 500;
  return files;
};

export const getFileContents = async (server: string, file: string): Promise<string> => {
  return http<string>(
    `/api/client/servers/${getGlobalDaemonType()}/${server}/files/contents`,
    { params: { file }, responseType: 'text' },
  );
};

export const saveFileContents = async (
  uuid: string,
  file: string,
  content: string,
): Promise<void> => {
  await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/write`,
    content,
    { params: { file }, headers: { 'Content-Type': 'text/plain' } },
  );
};

export const deleteFiles = async (uuid: string, directory: string, files: string[]): Promise<void> => {
  await api.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/delete`, {
    root: directory,
    files,
  });
};

export const renameFiles = async (
  uuid: string,
  directory: string,
  files: { to: string; from: string }[],
): Promise<void> => {
  await api.put(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/rename`, {
    root: directory,
    files,
  });
};

export const compressFiles = async (
  uuid: string,
  directory: string,
  files: string[],
): Promise<FileObject> => {
  const data: any = await http(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/compress`,
    { method: 'POST', body: { root: directory, files }, timeout: 60000 },
  );
  return rawDataToFileObject(data);
};

export const decompressFiles = async (
  uuid: string,
  directory: string,
  file: string,
): Promise<void> => {
  await http(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/decompress`,
    { method: 'POST', body: { root: directory, file }, timeout: 300000 },
  );
};

export const copyFile = async (uuid: string, location: string): Promise<void> => {
  await api.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/copy`, { location });
};

export const chmodFiles = async (
  uuid: string,
  directory: string,
  files: { file: string; mode: string }[],
): Promise<void> => {
  await api.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/chmod`, {
    root: directory,
    files,
  });
};

export const createDirectory = async (
  uuid: string,
  root: string,
  name: string,
): Promise<void> => {
  await api.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/create-folder`, {
    root,
    name,
  });
};

export const getFileDownloadUrl = async (uuid: string, file: string): Promise<string> => {
  const data: any = await api.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/download`,
    { file },
  );
  return data.attributes.url;
};

export const getFileUploadUrl = async (uuid: string): Promise<string> => {
  const data: any = await api.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/upload`,
  );
  return data.attributes.url;
};
