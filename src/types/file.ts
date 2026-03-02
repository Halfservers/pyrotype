export interface FileObject {
  key: string;
  name: string;
  mode: string;
  modeBits: string;
  size: number;
  isFile: boolean;
  isSymlink: boolean;
  mimetype: string;
  createdAt: Date;
  modifiedAt: Date;
  isArchiveType: () => boolean;
  isEditable: () => boolean;
}

export interface FileUploadData {
  name: string;
  size: number;
  file: File;
}
