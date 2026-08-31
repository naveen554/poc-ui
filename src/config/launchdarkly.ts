// LaunchDarkly feature flags configuration

interface FeatureFlags {
  performanceGuaranteeLdflag: boolean;
  reviewProgressLdflag: boolean;
  reportsLdflag: boolean;
  extractionExceptionsLdflag: boolean;
  pgValidationsLdflag: boolean;
  operationalDataLdflag: boolean;
}

// Default flag values
const defaultFlags: FeatureFlags = {
  performanceGuaranteeLdflag: true,
  reviewProgressLdflag: false,
  reportsLdflag: false,
  extractionExceptionsLdflag: false,
  pgValidationsLdflag: false,
  operationalDataLdflag: false,
};

// Get feature flag value
export function getFeatureFlag(flagName: keyof FeatureFlags): boolean {
  // In a real implementation, this would call LaunchDarkly SDK
  // For now, return default values
  return defaultFlags[flagName];
}

// Export flag names for easier usage
export const FeatureFlagKeys = {
  PERFORMANCE_GUARANTEE: 'performanceGuaranteeLdflag' as keyof FeatureFlags,
  REVIEW_PROGRESS: 'reviewProgressLdflag' as keyof FeatureFlags,
  REPORTS: 'reportsLdflag' as keyof FeatureFlags,
  EXTRACTION_EXCEPTIONS: 'extractionExceptionsLdflag' as keyof FeatureFlags,
  PG_VALIDATIONS: 'pgValidationsLdflag' as keyof FeatureFlags,
  OPERATIONAL_DATA: 'operationalDataLdflag' as keyof FeatureFlags,
} as const;
