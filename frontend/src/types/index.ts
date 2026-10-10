export interface Staff {
  id: string;
  name: string;
  role: 'STAFF' | 'MANAGER';
  certifications: string[];
}

export interface Shift {
  id: string;
  start: string;
  end: string;
  required_certification: string | null;
  assigned_to: string;
}

export interface Listing {
  id: string;
  shift_id: string;
  status: 'OPEN' | 'CLAIMED' | 'APPROVED' | 'WITHDRAWN';
  poster_id: string;
  claimed_by: string | null;
}

export interface RuleViolation {
  rule_number: number;
  rule_name: string;
  message: string;
  conflicting_shift_id?: string | null;
  conflicting_shift_times?: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  violations: RuleViolation[];
  weekly_hours_before: number;
  shift_hours: number;
  weekly_hours_after: number;
}

export interface ShiftWithListing {
  id: string;
  start: string;
  end: string;
  required_certification: string | null;
  assigned_to: string;
  assigned_to_name: string;
  duration_hours: number;
  listing: Listing | null;
  eligibility: EligibilityResult | null;
}

export interface ActionHistoryItem {
  id: number;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  action_type: 'POST' | 'WITHDRAW' | 'CLAIM' | 'UNCLAIM' | 'APPROVE' | 'REJECT' | 'SEED';
  shift_id: string;
  listing_id: string | null;
  outcome: 'SUCCESS' | 'REFUSED';
  details: string;
}
