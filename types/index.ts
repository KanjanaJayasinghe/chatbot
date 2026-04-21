export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface DatasetRow {
  id: string;
  searchText: string;
  rowIndex: number;
  [key: string]: unknown;
}
