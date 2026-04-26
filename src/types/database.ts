export interface School {
  id: string;
  school_code: string;
  school_name: string;
  stage?: string;
  type?: string;
  is_active: boolean;
}

export interface Supervisor {
  id: string;
  name: string;
  national_id?: string;
  specialty: string;
  current_school_id?: string;
  is_active: boolean;
}

export interface SupervisorWish {
  id: string;
  supervisor_id: string;
  wish_1?: string;
  wish_2?: string;
  wish_3?: string;
  wish_4?: string;
}

export interface DistributionResult {
  id: string;
  supervisor_id: string;
  assigned_school_id: string;
  rank_achieved: number; // 1-4, or 0 for forced
  distribution_date: string;
  
  // Joined data
  supervisor?: Supervisor;
  school?: School;
}

export interface DistributionSetting {
  id: string;
  setting_key: string;
  setting_value: string;
}
