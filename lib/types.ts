export interface Defect {
  dangerous: boolean;
  text: string;
  type: string;
}

export interface LatestMot {
  result: string;
  date: string;
  expiry: string | null;
  defects: Defect[];
}

export interface FailureInsight {
  component: string;
  severity: "Dangerous" | "Major" | "Minor" | null;
  count: number;
  percentage: number;
  plain_english?: string;
  what_it_means?: string;
}

export interface PeerAnalysis {
  make: string;
  model: string;
  sample_size: number;
  pass_rate: number | null;
  common_failures: FailureInsight[];
}

export interface VehicleReport {
  registration: string;
  make: string;
  model: string;
  year: string;
  fuel_type: string;
  colour: string;
  mileage: number;
  last_v5c_issued: string | null;
  tax_status: string | null;
  tax_due_date: string | null;
  latest_mot: LatestMot;
  peer_analysis: PeerAnalysis;
}

export interface MotTest {
  motTestNumber: string;
  completedDate: string;
  testResult: string;
  odometerValue: string;
  odometerUnit: string;
  expiryDate: string | null;
  defects: Defect[];
}

export interface VehicleDetail {
  registration: string;
  make: string;
  model: string;
  firstUsedDate: string;
  fuelType: string;
  primaryColour: string;
  engineSize: string;
  hasOutstandingRecall: string;
  motTests: MotTest[];
}
