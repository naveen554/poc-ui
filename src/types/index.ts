export type FileStatus = 'Completed' | 'Failed' | 'Processing' | 'Processed';

export interface UploadedFile {
  id: string;
  name: string;
  documentType: string;
  uploadedOn: string;
  policyNo: string[];
  slaTarget: string;
  penaltyAllocation: string;
  status: FileStatus;
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