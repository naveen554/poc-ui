interface FeatureFlags {
  performanceGuaranteeLdflag: boolean;
  reviewProgressLdflag: boolean;
  dataHarnessLdflag: boolean;
  reportsLdflag: boolean;
  extractionExceptionsLdflag: boolean;
  pgValidationsLdflag: boolean;
  operationalDataLdflag: boolean;
}

const defaultFlags: FeatureFlags = {
  performanceGuaranteeLdflag: true,
  reviewProgressLdflag: false,
  dataHarnessLdflag: true,
  reportsLdflag: true,
  extractionExceptionsLdflag: false,
  pgValidationsLdflag: false,
  operationalDataLdflag: false,
};

export function getFeatureFlag(flagName: keyof FeatureFlags): boolean {
  return defaultFlags[flagName];
}

export const FeatureFlagKeys = {
  PERFORMANCE_GUARANTEE: 'performanceGuaranteeLdflag' as keyof FeatureFlags,
  REVIEW_PROGRESS: 'reviewProgressLdflag' as keyof FeatureFlags,
  DATA_HARNESS: 'dataHarnessLdflag' as keyof FeatureFlags,
  REPORTS: 'reportsLdflag' as keyof FeatureFlags,
  EXTRACTION_EXCEPTIONS: 'extractionExceptionsLdflag' as keyof FeatureFlags,
  PG_VALIDATIONS: 'pgValidationsLdflag' as keyof FeatureFlags,
  OPERATIONAL_DATA: 'operationalDataLdflag' as keyof FeatureFlags,
} as const;
