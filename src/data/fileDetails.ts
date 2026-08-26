import { FileDetail } from '../types';

export const documentPreviewUrl = "/b2e5e938-62c5-4fca-b66e-16e1831b5b0e.jpg";


const baseValidations = [
{
  id: 'v1',
  validationType: 'RPAY_302',
  processName: 'tc=302 (Holding Inquiry)',
  fieldName: 'Owner Ssn',
  status: 'Passed' as const,
  expected: '**a-**-0670',
  actual: 'Found in system with 1 policies',
  match: 'Yes' as const
},
{
  id: 'v2',
  validationType: 'RPAY_203',
  processName: 'tc=203 (Policy Inquiry)',
  fieldName: 'Owner Ssn Match',
  status: 'Passed' as const,
  expected: 'Policy SSN 848-48-0670',
  actual: 'Document SSN 848-48-0670',
  match: 'Yes' as const
},
{
  id: 'v3',
  validationType: 'RPAY_203',
  processName: 'tc=203 (Policy Inquiry)',
  fieldName: 'Owner Name Match',
  status: 'Passed' as const,
  expected: 'BETTY-JEBE HUDSOB',
  actual: 'Betty-Jebe Hudsob',
  match: 'Yes' as const
},
{
  id: 'v4',
  validationType: 'RPAY_203',
  processName: 'tc=203 (Policy Inquiry)',
  fieldName: 'Policy Status',
  status: 'Passed' as const,
  expected: 'ACTIVE / IN FORCE',
  actual: 'ACTIVE',
  match: 'Yes' as const
},
{
  id: 'v5',
  validationType: 'RPAY_408',
  processName: 'tc=408 (Address Verification)',
  fieldName: 'Owner Mailing Address',
  status: 'Failed' as const,
  expected: '9847 MGBEHPH WAY, BETEGH, MD',
  actual: '9847 Mgbehph Way, Betegh, MD 98985',
  match: 'No' as const
},
{
  id: 'v6',
  validationType: 'SFDC_CASE',
  processName: 'Beneficiary Update Request',
  fieldName: 'Section Selected',
  status: 'Passed' as const,
  expected: 'Beneficiary, Sections 2 and 5',
  actual: 'Beneficiary, Sections 2 and 5',
  match: 'Yes' as const
}];


export const fileDetails: Record<string, FileDetail> = {
  '4725_001_C': {
    fileId: '4725_001_C',
    fileName: '4725_001_C.pdf',
    status: 'Completed',
    currentProcess: 'COMPLETED',
    uploadedAt: '08/17/2026, 05:39 AM',
    processedAt: '08/17/2026, 05:40 AM',
    outcomeLabel: 'Added Beneficiary - ID: 260817-908536415V',
    metrics: {
      overallConfidence: 88,
      confidenceScore: 0.98,
      routingDecision: 'REVIEW',
      routingContext: 'ownership_beneficiary_change',
      extraction: 84,
      extractionLabel: 'Good',
      completeness: 90,
      completenessLabel: 'High',
      typeDetection: 'Type Detection'
    },
    extractedFields: [
    { label: 'Policy Number', value: '59104133', confidence: 95 },
    { label: 'Owner Name', value: 'Betty-Jebe Hudsob', confidence: 70 },
    { label: 'Owner Social Security Number', value: '848-48-0670', confidence: 85 },
    { label: 'Owner Mailing Address', value: '9847 Mgbehph Way', confidence: 65 },
    { label: 'Owner City', value: 'Betegh', confidence: 65 },
    { label: 'Owner State', value: 'MD', confidence: 100 },
    { label: 'Owner Zip Code', value: '989856975', confidence: 70 },
    { label: 'Section Selected', value: 'Beneficiary, Sections 2 and 5', confidence: 90 },
    { label: 'Beneficiary Name', value: 'Marcus J. Hudsob', confidence: 88 },
    { label: 'Beneficiary Relationship', value: 'Son', confidence: 92 },
    { label: 'Beneficiary Share', value: '100%', confidence: 100 },
    { label: 'Signature Date', value: '10/11/1953', confidence: 62 }],

    validations: baseValidations
  }
};

const fallbackDetail = (fileId: string, fileName: string, status: FileDetail['status']): FileDetail => ({
  ...fileDetails['4725_001_C'],
  fileId,
  fileName,
  status,
  currentProcess: status === 'Failed' ? 'VALIDATION_FAILED' : status.toUpperCase(),
  outcomeLabel:
  status === 'Failed' ?
  'Validation failed - manual review required' :
  status === 'Processing' ?
  'Extraction in progress' :
  'Added Beneficiary - ID: 260817-908536415V',
  metrics:
  status === 'Failed' ?
  {
    ...fileDetails['4725_001_C'].metrics,
    overallConfidence: 61,
    confidenceScore: 0.54,
    routingDecision: 'MANUAL',
    extraction: 48,
    extractionLabel: 'Low',
    completeness: 63,
    completenessLabel: 'Medium'
  } :
  fileDetails['4725_001_C'].metrics
});

export function getFileDetail(
fileId: string,
fileName: string,
status: FileDetail['status'])
: FileDetail {
  return fileDetails[fileId] ?? fallbackDetail(fileId, fileName, status);
}