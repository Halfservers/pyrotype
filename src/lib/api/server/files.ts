import http from '@/lib/api/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { type FileObject, rawDataToFileObject } from '@/lib/api/transformers';

export type { FileObject } from '@/lib/api/transformers';

export const loadDirectory = async (uuid: string, directory?: string): Promise<FileObject[]> => {
  const { data } = await http.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/list`,
    { params: { directory: directory ?? '/' } },
  );
  const files = (data.data || []).map(rawDataToFileObject);
  if (files.length > 500) files.length = 500;
  return files;
};

export const getFileContents = (server: string, file: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    http
      .get(`/api/client/servers/${getGlobalDaemonType()}/${server}/files/contents`, {
        params: { file },
        transformResponse: (res) => res,
        responseType: 'text',
      })
      .then(({ data }) => resolve(data))
      .catch(reject);
  });
};

export const saveFileContents = async (
  uuid: string,
  file: string,
  content: string,
): Promise<void> => {
  await http.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/write`, content, {
    params: { file },
    headers: { 'Content-Type': 'text/plain' },
  });
};

export const deleteFiles = (uuid: string, directory: string, files: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/delete`, {
        root: directory,
        files,
      })
      .then(() => resolve())
      .catch(reject);
  });
};

export const renameFiles = (
  uuid: string,
  directory: string,
  files: { to: string; from: string }[],
): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .put(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/rename`, {
        root: directory,
        files,
      })
      .then(() => resolve())
      .catch(reject);
  });
};

export const compressFiles = async (
  uuid: string,
  directory: string,
  files: string[],
): Promise<FileObject> => {
  const { data } = await http.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/compress`,
    { root: directory, files },
    {
      timeout: 60000,
      timeoutErrorMessage:
        'It looks like this archive is taking a long time to generate. It will appear once completed.',
    },
  );
  return rawDataToFileObject(data);
};

export const decompressFiles = async (
  uuid: string,
  directory: string,
  file: string,
): Promise<void> => {
  await http.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/decompress`,
    { root: directory, file },
    {
      timeout: 300000,
      timeoutErrorMessage:
        'It looks like this archive is taking a long time to be unarchived. Once completed the unarchived files will appear.',
    },
  );
};

export const copyFile = (uuid: string, location: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/copy`, { location })
      .then(() => resolve())
      .catch(reject);
  });
};

export const chmodFiles = (
  uuid: string,
  directory: string,
  files: { file: string; mode: string }[],
): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/chmod`, {
        root: directory,
        files,
      })
      .then(() => resolve())
      .catch(reject);
  });
};

export const createDirectory = (
  uuid: string,
  root: string,
  name: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/create-folder`, {
        root,
        name,
      })
      .then(() => resolve())
      .catch(reject);
  });
};

export const getFileDownloadUrl = (uuid: string, file: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    http
      .get(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/download`, {
        params: { file },
      })
      .then(({ data }) => resolve(data.attributes.url))
      .catch(reject);
  });
};

export const getFileUploadUrl = (uuid: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    http
      .get(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/files/upload`)
      .then(({ data }) => resolve(data.attributes.url))
      .catch(reject);
  });
};
