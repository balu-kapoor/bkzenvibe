export interface FileType {
  id: string;
  name: string;
  content: string;
  language: 'typescript' | 'css' | 'json';
  path: string;
}

export interface FileSystemState {
  files: FileType[];
  activeFileId: string | null;
}

export interface GeneratedFiles {
  'App.tsx': string;
  'types.ts': string;
  'components/': {
    [key: string]: string;
  };
  'styles/': {
    'globals.css': string;
  };
} 