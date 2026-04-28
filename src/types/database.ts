// =============================================================================
// Enterprise-Grade Type Definitions
// منظومة التوزيع الذكي - إدارة العمرانية التعليمية
// =============================================================================

// ────────────────────────────────────────────────────────────
// ENUMS / CONSTANTS
// ────────────────────────────────────────────────────────────

export const STAGES = ['ابتدائي', 'إعدادي', 'ثانوي'] as const;
export const SCHOOL_TYPES = ['حكومي', 'لغات', 'خاص', 'تجريبي', 'فني'] as const;
export const SPECIALIZATIONS = [
  'عام', 'لغة عربية', 'رياضيات', 'علوم', 'لغة إنجليزية',
  'دراسات اجتماعية', 'تربية دينية', 'تربية فنية', 'تربية موسيقية',
  'تربية رياضية', 'لغة فرنسية', 'كيمياء', 'فيزياء', 'أحياء',
] as const;
export const SUPERVISOR_GRADES = ['معلم مساعد / معلم', 'معلم أول', 'معلم أول أ', 'معلم خبير', 'كبير معلمين'] as const;

export type Stage = string; // Allows dynamic stages like "ابتدائى - اعدادى" from DB
export type SchoolType = typeof SCHOOL_TYPES[number];
export type Specialization = typeof SPECIALIZATIONS[number];
export type SupervisorGrade = typeof SUPERVISOR_GRADES[number];
export type RunStatus = 'draft' | 'completed' | 'archived';
export type RankLabel = 'رغبة أولى' | 'رغبة ثانية' | 'رغبة ثالثة' | 'رغبة رابعة' | 'توزيع اضطراري';

// ────────────────────────────────────────────────────────────
// DATABASE MODELS
// ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'guidance';
  specialty?: string;
  created_at?: string;
  updated_at?: string;
}

export interface School {
  id: string;
  school_code: string;
  school_name: string;
  stage: Stage;
  school_type: SchoolType;
  specialization?: string;
  needs_count: number;
  address?: string;
  mandatory_supervisor_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined
  mandatory_supervisor?: Supervisor;
}

export interface Supervisor {
  id: string;
  national_id?: string;
  name: string;
  specialty: string;
  stage?: Stage;
  school_type?: SchoolType;
  home_school_id?: string;
  max_assignments?: number;
  phone?: string;
  is_active: boolean;
  grade?: SupervisorGrade;
  qualification?: string;
  appointment_type?: string;
  created_at?: string;
  updated_at?: string;
  // Joined
  home_school?: School;
  wishes?: SupervisorWish;
}

export interface SupervisorWish {
  id: string;
  supervisor_id: string;
  wish_1?: string;
  wish_2?: string;
  wish_3?: string;
  wish_4?: string;
  notes?: string;
  updated_at?: string;
  // Joined
  supervisor?: Supervisor;
  school_1?: School;
  school_2?: School;
  school_3?: School;
  school_4?: School;
}

export interface DistributionRun {
  id: string;
  run_name: string;
  academic_year: string;
  status: RunStatus;
  algorithm_params: AlgorithmParams;
  total_assigned: number;
  total_forced: number;
  satisfaction_rate: number;
  created_by: string;
  created_at: string;
}

export interface DistributionResult {
  id: string;
  run_id: string;
  supervisor_id: string;
  assigned_school_id: string;
  final_score: number;
  rank_achieved: number;  // 1-4 wishes, 0 = forced
  is_forced: boolean;
  is_manual_override: boolean;
  score_breakdown: ScoreBreakdown;
  rejection_reasons: RejectionReason[];
  created_at: string;
  // Joined
  supervisor?: Supervisor;
  school?: School;
  run?: DistributionRun;
}

export interface DistributionSetting {
  id: string;
  setting_key: string;
  setting_value: string;
}

export interface OverrideLog {
  id: string;
  run_id: string;
  result_id: string;
  previous_school_id?: string;
  new_school_id?: string;
  override_reason?: string;
  overridden_by: string;
  overridden_at: string;
}

// ────────────────────────────────────────────────────────────
// ALGORITHM TYPES
// ────────────────────────────────────────────────────────────

export interface AlgorithmParams {
  wish1_score: number;      // 100
  wish2_score: number;      // 80
  wish3_score: number;      // 60
  wish4_score: number;      // 40
  forced_score: number;     // 10
  specialization_bonus: number;  // 30
  stage_bonus: number;      // 20
  type_bonus: number;       // 20
  workload_penalty: number; // 15
  run_optimization: boolean; // Try swap improvements
}

export const DEFAULT_PARAMS: AlgorithmParams = {
  wish1_score: 100,
  wish2_score: 80,
  wish3_score: 60,
  wish4_score: 40,
  forced_score: 10,
  specialization_bonus: 30,
  stage_bonus: 20,
  type_bonus: 20,
  workload_penalty: 15,
  run_optimization: true,
};

export interface ScoreBreakdown {
  preference_score: number;   // 0-100 from wish match
  specialization_score: number; // 0-30
  stage_score: number;        // 0-20
  type_score: number;         // 0-20
  workload_penalty: number;   // negative
  total: number;
  preference_label: RankLabel | null;
}

export interface RejectionReason {
  supervisor_id: string;
  supervisor_name: string;
  reason: 'own_school' | 'no_capacity' | 'max_load' | 'lower_score';
  details?: string;
}

export interface AssignmentCandidate {
  supervisor: Supervisor;
  score: number;
  breakdown: ScoreBreakdown;
  rejectedAlternatives: RejectionReason[];
}

export interface AlgorithmResult {
  assignments: AssignmentPayload[];
  stats: DistributionStats;
}

export interface AssignmentPayload {
  supervisor_id: string;
  assigned_school_id: string;
  final_score: number;
  rank_achieved: number;
  is_forced: boolean;
  score_breakdown: ScoreBreakdown;
  rejection_reasons: RejectionReason[];
}

export interface DistributionStats {
  total: number;
  by_wish_1: number;
  by_wish_2: number;
  by_wish_3: number;
  by_wish_4: number;
  forced: number;
  unassigned: number;
  satisfaction_rate: number;
  avg_score: number;
}

// ────────────────────────────────────────────────────────────
// UI FORM TYPES
// ────────────────────────────────────────────────────────────

export type SchoolFormData = Omit<School, 'id' | 'created_at' | 'updated_at'>;
export type SupervisorFormData = Omit<Supervisor, 'id' | 'created_at' | 'updated_at' | 'home_school'>;

export interface WishFormData {
  supervisor_id: string;
  wish_1?: string;
  wish_2?: string;
  wish_3?: string;
  wish_4?: string;
  notes?: string;
}
