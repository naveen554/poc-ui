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
  rule_definition?: PGRuleDefinition;
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
  document_url: string;
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

export interface HierarchyContract {
  contract_id: string;
  client_name: string;
  broker_producer: string | null;
  overall_status: string;
  policy_numbers: string[];
  total_pgs: number;
  human_review_count: number;
  uploaded_at: string;
  contract_validation_failures?: number;
  contract_validation_warnings?: number;
}

export interface HierarchyClient {
  client_name: string;
  contracts: HierarchyContract[];
}

export interface HierarchyBroker {
  broker_producer: string;
  clients: HierarchyClient[];
}

export interface HierarchyResponse {
  brokers: HierarchyBroker[];
  total: number;
  limit: number;
  offset: number;
}

export async function listContractsHierarchy(
  limit: number = 25,
  offset: number = 0,
  status?: string
): Promise<HierarchyResponse> {
  const url = new URL(`${API_BASE_URL}/contracts/hierarchy`);
  url.searchParams.append('limit', String(limit));
  url.searchParams.append('offset', String(offset));
  if (status) url.searchParams.append('status', status);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { brokers: [], total: 0, limit, offset };
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch hierarchy: ${response.status} ${errorText}`);
  }

  return response.json();
}

export interface PolicySummary {
  policy_number: string;
  policy_id?: string;
  product_line?: string | null;
  effective_date?: string | null;
  end_date?: string | null;
  status?: string;
  total_pgs: number;
  pg_count?: number;
  pending_review: number;
  pending_count?: number;
  reviewed_count?: number;
  approved: number;
  approved_with_edits?: number;
  in_review?: number;
  classifications?: {
    standard: number;
    non_standard: number;
    custom_new?: number;
  };
}

export async function listPoliciesForContract(
  contractId: string
): Promise<PolicySummary[]> {
  const response = await fetch(
    `${API_BASE_URL}/contracts/${contractId}/policies`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return [];
    const errorText = await response.text();
    throw new Error(`Failed to fetch policies: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const raw = data.items || data.policies || [];
  return raw.map((item: any): PolicySummary => ({
    policy_number: item.policy_number,
    policy_id: item.policy_id,
    product_line: item.product_line ?? null,
    effective_date: item.effective_date ?? null,
    end_date: item.end_date ?? null,
    status: item.status,
    total_pgs: item.total_pgs ?? item.pg_count ?? 0,
    pg_count: item.pg_count,
    pending_review: item.pending_review ?? item.pending_count ?? 0,
    pending_count: item.pending_count,
    reviewed_count: item.reviewed_count,
    approved: item.approved ?? item.reviewed_count ?? 0,
    approved_with_edits: item.approved_with_edits,
    in_review: item.in_review,
    classifications: item.classifications,
  }));
}

export async function getPGsByPolicy(
  contractId: string,
  policyNumber: string,
  filters?: { reviewStatus?: string; classification?: string }
): Promise<PerformanceGuarantee[]> {
  const url = new URL(`${API_BASE_URL}/contracts/${contractId}/policies/${encodeURIComponent(policyNumber)}/pgs`);
  if (filters?.reviewStatus) url.searchParams.append('reviewStatus', filters.reviewStatus);
  if (filters?.classification) url.searchParams.append('classification', filters.classification);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    const errorText = await response.text();
    throw new Error(`Failed to fetch PGs for policy: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.items || [];
}

export function constructS3DocumentUrl(
  s3Bucket: string,
  s3Key: string
): string {
  if (!s3Bucket || !s3Key) return '';
  return `https://${s3Bucket}.s3.us-east-2.amazonaws.com/${s3Key}`;
}

export interface PGRuleDefinition {
  id: string;
  name: string;
  enabled: boolean;
  message_template?: string;
  pass_when?: string;
  fail_when?: string;
  warn_when?: string;
  info_when?: string;
  valid_range_lower?: number;
  valid_range_upper?: number;
  duplicate_key_fields?: string[];
  standard_renewal_days?: number;
  custom_renewal_examples?: number[];
  [key: string]: any;
}

export interface PGValidation {
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO' | 'SKIP';
  message: string;
  rule_id: string;
  rule_definition?: PGRuleDefinition;
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
  matched_policies?: Array<{ policy_number: string; product_line: string | null }>;
  standard_reference_definition?: {
    pg_id?: string;
    enabled?: boolean;
    pg_category?: string;
    pg_sub_category?: string;
    standard_metric_family?: string;
    product_line?: string[];
    standard_threshold?: number | null;
    threshold_unit?: string;
    threshold_direction?: string;
    threshold_qualifier?: string;
    standard_basis?: string;
    evaluation_period?: string;
    reporting_cadence?: string;
    penalty_cadence?: string;
    department?: string;
    source_system?: string;
    minimum_volume_threshold?: number;
    minimum_volume_fallback?: string;
    tier_structure?: any[];
    description?: string;
  };
  fields_changed?: number;
  contract_status?: string;
  review_progress?: {
    pending?: number;
    in_review?: number;
    approved?: number;
    approved_edits?: number;
    total?: number;
  };
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

export interface UpdatePGPayload {
  threshold_value?: number | string | null;
  threshold_unit?: string | null;
  basis_of_measurement?: string | null;
  notes?: string | null;
  penalty_allocation_percentage?: number | null;
  classification?: string | null;
  classification_reason?: string | null;
  comments?: string | null;
}

export async function updatePG(
  contractId: string,
  pgId: string,
  payload: UpdatePGPayload
): Promise<PerformanceGuarantee> {
  const response = await fetch(
    `${API_BASE_URL}/contracts/${contractId}/pgs/${pgId}`,
    {
      method: 'PUT',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update PG: ${response.status} ${errorText}`);
  }

  return response.json();
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

export async function searchPGs(
  q: string,
  filters?: { classification?: string; reviewStatus?: string; department?: string; metricMasterMatch?: string; nonStandardPattern?: string }
): Promise<PerformanceGuarantee[]> {
  const url = new URL(`${API_BASE_URL}/pgs/search`);
  url.searchParams.append('q', q);
  if (filters?.classification) url.searchParams.append('classification', filters.classification);
  if (filters?.reviewStatus) url.searchParams.append('reviewStatus', filters.reviewStatus);
  if (filters?.department) url.searchParams.append('department', filters.department);
  if (filters?.metricMasterMatch) url.searchParams.append('metricMasterMatch', filters.metricMasterMatch);
  if (filters?.nonStandardPattern) url.searchParams.append('nonStandardPattern', filters.nonStandardPattern);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    const errorText = await response.text();
    throw new Error(`PG search failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.items || [];
}

export interface ReviewQueueItem {
  review_id: string;
  contract_id: string;
  pg_record_id: string;
  pg_id: string;
  client_name: string;
  pg_sub_category: string;
  classification: string;
  review_priority: number;
  review_status: string;
  assigned_to: string | null;
  created_at: string;
}

export async function listReviewQueue(
  params?: { contractId?: string; priority?: number; assignedTo?: string; limit?: number; offset?: number }
): Promise<{ items: ReviewQueueItem[]; total: number; limit: number; offset: number }> {
  const url = new URL(`${API_BASE_URL}/review/queue`);
  if (params?.contractId) url.searchParams.append('contractId', params.contractId);
  if (params?.priority) url.searchParams.append('priority', String(params.priority));
  if (params?.assignedTo) url.searchParams.append('assignedTo', params.assignedTo);
  url.searchParams.append('limit', String(params?.limit ?? 25));
  url.searchParams.append('offset', String(params?.offset ?? 0));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return { items: [], total: 0, limit: params?.limit ?? 25, offset: params?.offset ?? 0 };
    const errorText = await response.text();
    throw new Error(`Failed to fetch review queue: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getReviewItem(reviewId: string): Promise<ReviewQueueItem & { pg?: PerformanceGuarantee }> {
  const response = await fetch(`${API_BASE_URL}/review/queue/${reviewId}`, {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch review item: ${response.status} ${errorText}`);
  }
  return response.json();
}

export type ReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export interface ReviewDecisionPayload {
  action: ReviewAction;
  comments?: string;
  editedFields?: Record<string, any> & { edit_reason?: string };
}

export async function submitReviewDecision(
  reviewId: string,
  payload: ReviewDecisionPayload
): Promise<{ message: string; review_status: string }> {
  const response = await fetch(`${API_BASE_URL}/review/queue/${reviewId}/decision`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to submit review decision: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function assignReviewItem(
  reviewId: string,
  assignedTo: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/review/queue/${reviewId}/assign`, {
    method: 'PUT',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assignedTo }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to assign review item: ${response.status} ${errorText}`);
  }
  return response.json();
}

export interface ReviewProgress {
  total: number;
  pending: number;
  in_review: number;
  approved: number;
  approved_edits?: number;
  approved_with_edits?: number;
  rejected?: number;
}

export async function getReviewProgress(contractId: string): Promise<ReviewProgress> {
  const response = await fetch(
    `${API_BASE_URL}/review/contracts/${contractId}/progress`,
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
    throw new Error(`Failed to fetch review progress: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function getReportingStats(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/reporting/stats`, {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`);
  return response.json();
}

export async function getReportingExposure(clientName?: string): Promise<any> {
  const url = new URL(`${API_BASE_URL}/reporting/exposure`);
  if (clientName) url.searchParams.append('clientName', clientName);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch exposure: ${response.status}`);
  return response.json();
}

export async function exportPGs(
  format: 'json' | 'csv',
  filters?: { classification?: string; clientName?: string; reviewStatus?: string }
): Promise<Blob> {
  const url = new URL(`${API_BASE_URL}/reporting/export`);
  url.searchParams.append('format', format);
  if (filters?.classification) url.searchParams.append('classification', filters.classification);
  if (filters?.clientName) url.searchParams.append('clientName', filters.clientName);
  if (filters?.reviewStatus) url.searchParams.append('reviewStatus', filters.reviewStatus);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'X-API-Key': API_KEY },
  });
  if (!response.ok) throw new Error(`Export failed: ${response.status}`);
  return response.blob();
}
