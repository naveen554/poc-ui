import { ContractDetails, ContractValidation } from './api';
import { FileDetail, FileStatus, UploadedFile, ValidationResult, ExtractedField } from '../types';

export function mapStatusToFileStatus(apiStatus: string): FileStatus {
  const status = apiStatus.toUpperCase();
  
  if (status === 'PROCESSING' || status === 'PENDING') {
    return 'Processing';
  }
  
  if (status === 'COMPLETED' || status === 'APPROVED' || status === 'PENDING_REVIEW') {
    return 'Completed';
  }
  
  if (status === 'FAILED' || status === 'REJECTED') {
    return 'Failed';
  }
  
  if (status === 'PROCESSED') {
    return 'Processed';
  }
  
  return 'Processing';
}

function mapValidation(validation: ContractValidation): ValidationResult {
  return {
    id: validation.rule_id,
    validationType: validation.rule_id,
    processName: validation.message.substring(0, 50) + '...',
    fieldName: validation.rule_id,
    status: validation.status === 'PASS' ? 'Passed' : 'Failed',
    expected: validation.message,
    actual: validation.message,
    match: validation.status === 'PASS' ? 'Yes' : 'No',
  };
}

function calculateConfidence(validations: ContractValidation[]): number {
  if (validations.length === 0) return 0;
  
  const passed = validations.filter(v => v.status === 'PASS').length;
  return Math.round((passed / validations.length) * 100);
}

export function mapContractToFileDetail(contract: ContractDetails): FileDetail {
  const confidence = calculateConfidence(contract.contract_validations);
  const hasFailures = contract.contract_validation_failures > 0;
  const hasWarnings = contract.contract_validation_warnings > 0;
  
  let routingDecision = 'AUTO_APPROVE';
  if (hasFailures) {
    routingDecision = 'MANUAL';
  } else if (hasWarnings) {
    routingDecision = 'REVIEW';
  }
  
  const extractedFields: ExtractedField[] = [
    { label: 'Client Name', value: contract.client_name, confidence: 95 },
    { label: 'Contract Date', value: contract.contract_date, confidence: 90 },
    { label: 'Agreement Period', value: `${contract.agreement_period_start} to ${contract.agreement_period_end}`, confidence: 95 },
    { label: 'Agreement Type', value: contract.agreement_period_type, confidence: 100 },
    { label: 'Policy Numbers', value: contract.policy_numbers.join(', '), confidence: 90 },
    { label: 'NYL Representative', value: contract.nyl_representative_name, confidence: 85 },
    { label: 'Total Amount at Risk', value: contract.total_amount_at_risk_desc || 'Not specified', confidence: 80 },
    { label: 'Premium Percentage', value: `${contract.premium_percentage}%`, confidence: 90 },
    { label: 'Admin Fee Percentage', value: `${contract.admin_fee_percentage}%`, confidence: 90 },
    { label: 'Dollar Cap', value: contract.dollar_cap ? `$${parseFloat(contract.dollar_cap).toLocaleString()}` : 'None', confidence: 95 },
    { label: 'Penalty Basis', value: contract.penalty_basis, confidence: 100 },
    { label: 'Signature Status', value: contract.signature_status, confidence: 92 },
    { label: 'Signature Date', value: contract.signature_date, confidence: 88 },
    { label: 'Total Pages', value: contract.contract_pages_total.toString(), confidence: 100 },
    { label: 'Total PGs', value: contract.total_pgs.toString(), confidence: 95 },
    { label: 'Standard Count', value: contract.standard_count.toString(), confidence: 90 },
    { label: 'Non-Standard Count', value: contract.non_standard_count.toString(), confidence: 90 },
  ];
  
  return {
    fileId: contract.contract_id,
    fileName: `${contract.client_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    status: mapStatusToFileStatus(contract.overall_status),
    currentProcess: contract.overall_status,
    uploadedAt: new Date(contract.uploaded_at).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    processedAt: contract.extraction_metadata?.server_timestamp 
      ? new Date(contract.extraction_metadata.server_timestamp).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Pending',
    outcomeLabel: hasFailures 
      ? `${contract.contract_validation_failures} Validation(s) Failed` 
      : hasWarnings 
      ? `${contract.contract_validation_warnings} Warning(s) - Review Required`
      : 'Contract Validated Successfully',
    metrics: {
      overallConfidence: confidence,
      confidenceScore: confidence / 100,
      routingDecision,
      routingContext: contract.agreement_period_type,
      extraction: confidence,
      extractionLabel: confidence >= 80 ? 'Good' : confidence >= 60 ? 'Medium' : 'Low',
      completeness: Math.round((contract.standard_count / contract.total_pgs) * 100),
      completenessLabel: confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low',
      typeDetection: contract.agreement_period_type
    },
    extractedFields,
    validations: contract.contract_validations.map(mapValidation)
  };
}

export function mapContractToUploadedFile(contract: ContractDetails): UploadedFile {
  const status = mapStatusToFileStatus(contract.overall_status);
  
  const agreementType = contract.agreement_period_type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  
  const failures = contract.contract_validation_failures || 0;
  const warnings = contract.contract_validation_warnings || 0;
  let validationSummary = '—';
  
  if (failures > 0) {
    validationSummary = `${failures} Failed${warnings > 0 ? `, ${warnings} Warnings` : ''}`;
  } else if (warnings > 0) {
    validationSummary = `${warnings} Warning${warnings > 1 ? 's' : ''}`;
  } else if (contract.overall_status === 'PENDING_REVIEW') {
    validationSummary = 'Pending Review';
  } else {
    validationSummary = 'All Passed';
  }
  
  let penaltyAllocation = '—';
  if (contract.dollar_cap) {
    penaltyAllocation = `Up to $${parseFloat(contract.dollar_cap).toLocaleString()}`;
  } else if (contract.premium_percentage || contract.admin_fee_percentage) {
    const parts = [];
    if (contract.premium_percentage) {
      parts.push(`${contract.premium_percentage}% Premium`);
    }
    if (contract.admin_fee_percentage) {
      parts.push(`${contract.admin_fee_percentage}% Admin`);
    }
    penaltyAllocation = parts.join(' + ');
  }
  
  return {
    id: contract.contract_id,
    name: `${contract.client_name}.pdf`,
    documentType: agreementType,
    uploadedOn: new Date(contract.uploaded_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    policyNo: contract.policy_numbers && contract.policy_numbers.length > 0 
      ? contract.policy_numbers 
      : ['—'],
    slaTarget: validationSummary,
    penaltyAllocation: penaltyAllocation,
    status
  };
}

export function formatUploadDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
