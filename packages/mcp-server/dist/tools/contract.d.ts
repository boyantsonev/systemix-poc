/**
 * contract.ts — SYSTMIX-210
 *
 * MDX contract indexer: reads contract/tokens/ and contract/components/,
 * parses frontmatter, and answers 4 queries:
 *   contract_get_token(name)
 *   contract_list_drifted()
 *   contract_get_component(name)
 *   contract_get_quality_score()
 *
 * Intentionally no gray-matter dep — a small inline parser handles the
 * flat YAML frontmatter used by generate-contracts.ts.
 */
import type { ToolDefinition, ToolHandler } from "../types.js";
export declare const contractGetTokenDefinition: ToolDefinition;
export declare const contractGetTokenHandler: ToolHandler<{
    name: string;
}>;
export declare const contractListDriftedDefinition: ToolDefinition;
export declare const contractListDriftedHandler: ToolHandler<{
    unresolvedOnly?: boolean;
}>;
export declare const contractGetComponentDefinition: ToolDefinition;
export declare const contractGetComponentHandler: ToolHandler<{
    name: string;
}>;
export declare const contractGetEvidenceDefinition: ToolDefinition;
export declare const contractGetEvidenceHandler: ToolHandler<{
    name: string;
}>;
export declare const contractWriteEvidenceDefinition: ToolDefinition;
interface WriteEvidenceArgs {
    name: string;
    totalRenders: number;
    topVariant?: string | null;
    variants?: Record<string, {
        renders: number;
        uniqueUsers: number;
        pages?: string[];
    }>;
    topPages?: {
        page: string;
        renders: number;
    }[];
}
export declare const contractWriteEvidenceHandler: ToolHandler<WriteEvidenceArgs>;
export declare const contractGetHypothesisDefinition: ToolDefinition;
export declare const contractGetHypothesisHandler: ToolHandler<{
    id: string;
}>;
export declare const contractListHypothesesDefinition: ToolDefinition;
export declare const contractListHypothesesHandler: ToolHandler<{
    status?: string;
}>;
export declare const contractWriteHypothesisResultDefinition: ToolDefinition;
interface WriteHypothesisResultArgs {
    id: string;
    status: string;
    result?: string;
    decision: string;
    confidence?: number;
}
export declare const contractWriteHypothesisResultHandler: ToolHandler<WriteHypothesisResultArgs>;
export declare const contractGetQualityScoreDefinition: ToolDefinition;
export declare const contractGetQualityScoreHandler: ToolHandler;
export {};
//# sourceMappingURL=contract.d.ts.map