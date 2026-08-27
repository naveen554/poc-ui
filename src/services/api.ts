const API_BASE_URL = 'https://mjl012ia1a.execute-api.us-east-2.amazonaws.com/poc/api/v1';
const API_KEY = 'nyl-poc-admin-key-2026';

export interface UploadResponse {
  contractId: string;
  executionArn: string;
  status: string;
  message: string;
}

export interface ContractValidation {
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO' | 'SKIP';
  message: string;
  rule_id: string;
}

export interface ExtractionMetadata {
  model: string;
  document_id: string;
  processed_at: string;
  document_pages: number;
  prompt_version: string;
  server_timestamp: string;
  extraction_version: string;
  processing_time_ms: number;
}

export interface ExtractionException {
  description: string;
  affected_field: string;
  exception_type: string;
}

export interface ContractDetails {
  contract_id: string;
  client_name: string;
  contract_date: string;
  agreement_period_start: string;
  agreement_period_end: string;
  agreement_period_type: string;
  policy_numbers: string[];
  nyl_representative_name: string;
  total_amount_at_risk_type: string | null;
  total_amount_at_risk_desc: string | null;
  premium_percentage: string;
  admin_fee_percentage: string;
  dollar_cap: string | null;
  penalty_basis: string;
  signature_status: string;
  signature_date: string;
  contract_pages_total: number;
  overall_status: string;
  s3_key: string;
  s3_bucket: string;
  pipeline_execution_arn: string | null;
  extraction_metadata: ExtractionMetadata;
  contract_validations: ContractValidation[];
  total_pgs: number;
  standard_count: number;
  non_standard_count: number;
  custom_new_count: number;
  human_review_count: number;
  contract_validation_failures: number;
  contract_validation_warnings: number;
  uploaded_by: string;
  uploaded_at: string;
  last_reviewed_by: string | null;
  last_reviewed_at: string | null;
  is_deleted: boolean;
  deleted_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  client_account_number: string | null;
  salesforce_client_name: string | null;
  renewal_date: string | null;
  cancellation_date: string | null;
  off_cycle_flag: boolean;
  broker_producer: string | null;
  account_manager: string | null;
  nae: string | null;
  region: string | null;
  territory: string | null;
  segment: string | null;
  sales_office: string | null;
  wtw_indicator: boolean;
  aon_indicator: boolean;
  std_premium: string | null;
  ltd_premium: string | null;
  fmla_premium: string | null;
  life_premium: string | null;
  vb_premium: string | null;
  implementation_amount_at_risk: string | null;
  extraction_exceptions: ExtractionException[];
  document_url: string;
}

export async function uploadContract(
  file: File,
  clientHint?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (clientHint) {
    formData.append('clientHint', clientHint);
  }

  const response = await fetch(`${API_BASE_URL}/contracts/upload`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getContractDetails(
  contractId: string
): Promise<ContractDetails> {
  const response = await fetch(`${API_BASE_URL}/contracts/${contractId}`, {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch contract: ${response.status} ${errorText}`);
  }

  return response.json();
}

export interface PipelineStatusResponse {
  contractId: string;
  pipelineStatus: string;
  execution?: {
    execution_arn: string;
    status: string;
    start_date: string;
    stop_date?: string;
  };
}

export async function getContractPipelineStatus(
  contractId: string
): Promise<PipelineStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/contracts/${contractId}/pipeline`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch pipeline status: ${response.status} ${errorText}`);
  }

  return response.json();
}

export interface ContractsListResponse {
  items: ContractDetails[];
  total: number;
  limit: number;
  offset: number;
}

export async function listContracts(
  limit: number = 25,
  offset: number = 0
): Promise<ContractDetails[]> {
  const response = await fetch(
    `${API_BASE_URL}/contracts?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch contracts: ${response.status} ${errorText}`);
  }

  const data: ContractsListResponse = await response.json();
  return data.items || [];
}

export function constructS3DocumentUrl(
  s3Bucket: string,
  s3Key: string
): string {
  if (!s3Bucket || !s3Key) return '';
  return `https://${s3Bucket}.s3.us-east-2.amazonaws.com/${s3Key}`;
}

export interface PGValidation {
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO' | 'SKIP';
  message: string;
  rule_id: string;
}

export interface PerformanceGuarantee {
  pg_record_id: string;
  contract_id: string;
  pg_id: string;
  current_version: number;
  pg_category: string;
  pg_sub_category: string;
  pg_metric_name: string;
  department: string;
  operational_area: string;
  product_line: string[];
  performance_standard_text: string;
  threshold_value: string | null;
  threshold_unit: string;
  threshold_direction: string;
  threshold_qualifier: string;
  basis_of_measurement: string;
  evaluation_method_text: string | null;
  evaluation_period: string;
  penalty_allocation_pct: string;
  penalty_type: string;
  penalty_dollar_amount: string | null;
  penalty_tier_structure: any[];
  earnback_provision: string | null;
  min_volume_threshold: string | null;
  min_volume_fallback: string | null;
  third_party_references: any[];
  amendment_flag: boolean;
  notes: string;
  classification: string;
  classification_reason: string;
  deviation_details: string;
  standard_reference: string;
  confidence_score: string;
  confidence_level: string;
  human_review_required: boolean;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  pg_validations: PGValidation[];
  client_name: string;
  contract_date: string;
  agreement_period_start: string;
  agreement_period_end: string;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_modified_by: string;
  metric_owner: string | null;
  source_system: string | null;
  results_source: string | null;
  metric_amount_at_risk: string | null;
  reporting_cadence: string;
  penalty_cadence: string;
  volume_threshold_type: string | null;
  volume_comparison_operator: string | null;
  volume_exception_notes: string | null;
  review_priority: number;
}

export async function getPGsByContract(
  contractId: string,
  reviewStatus?: string
): Promise<PerformanceGuarantee[]> {
  const url = new URL(`${API_BASE_URL}/contracts/${contractId}/pgs`);
  if (reviewStatus) {
    url.searchParams.append('reviewStatus', reviewStatus);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch PGs: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function getPGDetail(
  contractId: string,
  pgId: string
): Promise<PerformanceGuarantee> {
  const response = await fetch(
    `${API_BASE_URL}/contracts/${contractId}/pgs/${pgId}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch PG detail: ${response.status} ${errorText}`);
  }

  return response.json();
}

export interface PGHistoryItem {
  version_id: string;
  pg_record_id: string;
  contract_id: string;
  pg_id: string;
  version_number: number;
  pg_snapshot: any;
  change_action: string;
  change_reason: string | null;
  changed_by: string;
  changed_at: string;
  pg_category: string;
  pg_sub_category: string;
}

export async function getPGHistory(
  contractId: string,
  pgId: string
): Promise<PGHistoryItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/contracts/${contractId}/pgs/${pgId}/history`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch PG history: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function deleteContract(
  contractId: string
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/contracts/${contractId}`,
    {
      method: 'DELETE',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to delete contract: ${response.status}`);
  }

  return response.json();
}
