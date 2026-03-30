export const EUROPEAN_TERRITORIES = [
  'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium',
  'Bosnia & Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany',
  'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
  'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
  'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
  'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
  'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican City',
] as const

export const LINES_OF_BUSINESS = ['Casualty', 'Property', 'IFL', 'Cyber'] as const

export type LineOfBusiness = typeof LINES_OF_BUSINESS[number]

export const COVERAGE_BY_LOB: Record<LineOfBusiness, string[]> = {
  Casualty: [
    'Employers Liability',
    'Public Liability',
    'Products Liability',
    'Professional Indemnity',
    'Directors & Officers',
  ],
  Property: [
    'Material Damage',
    'Business Interruption',
    'Machinery Breakdown',
    'Contractors All Risks',
    'Industrial All Risks',
  ],
  IFL: [
    'Trade Credit',
    'Political Risk',
    'Surety Bonds',
    'Financial Guarantee',
    'Structured Trade Finance',
  ],
  Cyber: [
    'First-Party Data Breach',
    'Third-Party Liability',
    'Business Interruption (Cyber)',
    'Ransomware & Extortion',
    'Cyber Crime / Social Engineering',
  ],
}
