import { default as documents } from './views/Documents.vue';
export { documents };
export default documents;
export interface documentsProps {
    symbolRoot: string;
    userId?: string | null;
}
