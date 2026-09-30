/**
 * AURA Typed Memory Model
 * Memory is structured and typed, not raw unstructured chat logs.
 */

export type MemoryCategory = 
  | 'fact'          // Explicit facts (e.g., "User drinks green tea")
  | 'preference'    // User choices & preferences (e.g., "Prefers dark mode, early mornings")
  | 'goal'          // Long-term aspirations and key results
  | 'commitment'    // Active promises, deadlines, and agreements
  | 'project'       // Active project context and technical decisions
  | 'episode'       // Significant life/work events and milestones
  | 'decision';     // Key decisions made and their rationales

export interface MemoryRecord {
  id: string;
  category: MemoryCategory;
  content: string;
  source: string;              // Where this memory originated (e.g., 'conversation', 'document')
  confidence: number;          // 0.0 to 1.0 confidence score
  tags: string[];
  createdAt: string;
  updatedAt: string;
  verifiedByUser: boolean;     // Whether the user explicitly reviewed/approved this memory
}
