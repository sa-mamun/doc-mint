import type { ThemePreference } from './theme';

export type MintDocument = {
  id: string;
  name: string;
  fileName: string;
  thumbnailName?: string;
  createdAt: number;
  pageCount?: number;
  size: number;
  favorite: boolean;
};

export type Library = { version: 1; theme: ThemePreference; documents: MintDocument[] };
export type DraftPage = { id: string; uri: string; originalUri?: string; width: number; height: number };
