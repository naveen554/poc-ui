export type FileStatus = 'Completed' | 'Failed' | 'Processing' | 'Processed' | 'Pending Review' | 'Partially Reviewed' | 'Approved' | 'Rejected';

export interface UploadedFile {
  id: string;
  clientName: string;
  policies: string[];
  pgsTotal: number;
  pgsPending: number;
  status: FileStatus;
  uploadedOn: string;
  documentType?: string;
  penaltyAllocation?: string;
  versions?: UploadedFile[];
  versionLabel?: string;
}

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
}

export interface FileMetrics {
  overallConfidence: number;
  confidenceScore: number;
  routingDecision: string;
  routingContext: string;
  extraction: number;
  extractionLabel: string;
  completeness: number;
  completenessLabel: string;
  typeDetection: string;
}

export interface ValidationResult {
  id: string;
  validationType: string;
  processName: string;
  fieldName: string;
  status: 'Passed' | 'Failed';
  expected: string;
  actual: string;
  match: 'Yes' | 'No';
}

export interface FileDetail {
  fileId: string;
  fileName: string;
  status: FileStatus;
  currentProcess: string;
  uploadedAt: string;
  processedAt: string;
  outcomeLabel: string;
  metrics: FileMetrics;
  extractedFields: ExtractedField[];
  validations: ValidationResult[];
}

export type ReviewAnswer = 'No Issue' | 'Issue' | 'N/A';

export type ReviewStatus = 'Pending' | 'In Review' | 'Submitted';

export type ReviewOutcome = 'Not Started' | 'No Issue' | 'Issue';

export interface ReviewQuestion {
  id: string;
  label: string;
  helper?: string;
}

export interface ReviewQuestionGroup {
  id: string;
  title: string;
  standard: string;
  slaDays: number | null;
  questions: ReviewQuestion[];
}

export interface ManualReviewRecord {
  id: string;
  lob: string;
  quarter: string;
  policyNumber: string;
  groupName: string;
  auditorInitials: string;
  dateReviewed: string;
  leaveManager: string;
  employeeName: string;
  leaveId: string;
  prelimEmailDate: string;
  autoFillNoIssue: boolean;
  reviewStatus: ReviewStatus;
  outcome: ReviewOutcome;
  openFindings: number;
}

export interface ReviewResponse {
  answer: ReviewAnswer | null;
  comment: string;
}

export type SystemFeedStatus = 'Connected' | 'Degraded' | 'Manual' | 'Offline';

export interface SystemFeed {
  id: string;
  name: string;
  description: string;
  method: string;
  cadence: string;
  lastSync: string;
  records: string;
  coverage: number;
  status: SystemFeedStatus;
}