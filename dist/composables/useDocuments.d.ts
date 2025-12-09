import { SupabaseClient } from '@supabase/supabase-js';
export interface Document {
    id: string;
    user_id: string;
    symbol_root: string;
    file_name: string;
    file_size: number;
    file_type: string;
    storage_path: string;
    uploaded_at: string;
    description?: string;
}
export declare function useDocuments(supabase: SupabaseClient): {
    documents: import('vue').Ref<{
        id: string;
        user_id: string;
        symbol_root: string;
        file_name: string;
        file_size: number;
        file_type: string;
        storage_path: string;
        uploaded_at: string;
        description?: string | undefined;
    }[], Document[] | {
        id: string;
        user_id: string;
        symbol_root: string;
        file_name: string;
        file_size: number;
        file_type: string;
        storage_path: string;
        uploaded_at: string;
        description?: string | undefined;
    }[]>;
    isLoading: import('vue').Ref<boolean, boolean>;
    error: import('vue').Ref<string | null, string | null>;
    uploadProgress: import('vue').Ref<number, number>;
    fetchDocuments: (symbolRoot: string, userId?: string) => Promise<void>;
    uploadDocument: (file: File, symbolRoot: string, userId: string, description?: string) => Promise<any>;
    downloadDocument: (document: Document) => Promise<void>;
    deleteDocument: (document: Document) => Promise<void>;
    formatFileSize: (bytes: number) => string;
};
