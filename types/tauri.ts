// Tauri command types for type-safe communication

export interface AttackSimulationResult {
  id: string;
  timestamp: string;
  attackType: string;
  status: 'success' | 'failed' | 'blocked';
  riskScore: number;
  logs: string[];
  metrics: {
    duration: number;
    attempts: number;
    blocked: number;
  };
}

export interface HardeningTask {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'pending' | 'completed' | 'failed' | 'in-progress' | 'not-applicable';
  suggestions: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  platform: string[];
  command?: string;
  manualSteps: string[];
  impact: 'low' | 'medium' | 'high';
  requiresReboot: boolean;
  estimatedTime: string;
}

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cve?: string;
  affectedSystems: string[];
  detectedAt: string;
  remediation: string;
}

export interface AutoResponseSettings {
  autoPatch: boolean;
  autoQuarantine: boolean;
  autoNotify: boolean;
  patchDelay: number; // seconds
  quarantineThreshold: 'low' | 'medium' | 'high' | 'critical';
}

export interface ResponseActivity {
  id: string;
  timestamp: string;
  action: 'patch' | 'quarantine' | 'notify' | 'scan';
  target: string;
  status: 'success' | 'failed' | 'pending';
  details: string;
}

export interface ScanResult {
  id: string;
  os: string;
  timestamp: string;
  vulnerabilities: Vulnerability[];
  openPorts: number[];
  services?: string[];
  securityScore: number;
  securityGrade: 'Excellent' | 'Good' | 'Moderate' | 'Risky' | 'Critical';
}

export interface StoredVulnerability {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix: string;
  status: 'pending' | 'in-progress' | 'fixed' | 'failed';
  cve?: string;
  affectedSystems: string[];
  detectedAt: string;
  remediation: string;
}

export interface StoredScanResult {
  scanId: string;
  timestamp: string;
  os: string;
  securityScore: number;
  securityGrade: string;
  vulnerabilities: StoredVulnerability[];
}

export interface FixSuggestion {
  title: string;
  description: string;
  command?: string;
  manualSteps: string[];
  autoFixable: boolean;
}

// Attack Hub Types
export interface AttackScenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'Web' | 'Network' | 'System';
  port: number;
  flags: ScenarioFlag[];
  vulnerabilities: string[];
  estimatedTime: number; // minutes
  status: 'available' | 'running' | 'completed';
}

export interface ScenarioFlag {
  id: string;
  name: string;
  description: string;
  value: string;
  captured: boolean;
  captureMethod: string;
}

export interface AttackStep {
  id: string;
  name: string;
  description: string;
  command: string;
  expectedOutput: string;
  completed: boolean;
  output?: string;
}

export interface ScanComparison {
  baselineScanId: string;
  currentScanId: string;
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
  newVulnerabilities: StoredVulnerability[];
  resolvedVulnerabilities: StoredVulnerability[];
  unchangedCount: number;
}

export interface SearchHit {
  kind: 'scan' | 'vulnerability' | 'hardening' | 'scenario' | string;
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

export interface WordlistInfo {
  id: string;
  name: string;
  lineCount: number;
  sizeBytes: number;
  builtin: boolean;
  createdAt: string;
}

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  channel: string;
  signal: number;
  security: string;
  inUse: boolean;
}

export interface UserEnumResult {
  username: string;
  likelyValid: boolean;
  detail: string;
}

export interface HttpUserEnumResult {
  username: string;
  likelyValid: boolean;
  statusCode: number;
  responseLen: number;
  detail: string;
}

export interface BruteJobProgress {
  tried: number;
  total: number;
  current: string;
  percent: number;
}

export interface BruteJobResult {
  success: boolean;
  credential?: string;
  username?: string;
  password?: string;
  message: string;
}

export interface BruteJob {
  jobId: string;
  kind: string;
  target: string;
  status: string;
  progress: BruteJobProgress;
  logs: string[];
  result?: BruteJobResult;
  startedAt: string;
  finishedAt?: string;
}

export interface SshBruteParams {
  host: string;
  port: number;
  username?: string;
  usernameWordlistId?: string;
  passwordWordlistId: string;
  threads?: number;
}

export interface HttpBruteParams {
  url: string;
  method?: string;
  usernameField: string;
  passwordField: string;
  username?: string;
  usernameWordlistId?: string;
  passwordWordlistId: string;
  extraFields?: Record<string, string>;
  failureIndicators?: string[];
  successIndicators?: string[];
}

export interface ScenarioProbeResult {
  scenarioId: string;
  port: number;
  reachable: boolean;
  message: string;
  findings: string[];
}

export interface AttackSession {
  sessionId: string;
  scenarioId: string;
  status: 'starting' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep: number;
  steps: AttackStep[];
  flagsCaptured: string[];
  logs: string[];
  startTime: string;
  endTime?: string;
  score: number;
}

export interface PentestActivity {
  id: string;
  timestamp: string;
  category: string;
  kind: string;
  title: string;
  target: string;
  status: string;
  severity: string;
  summary: string;
  details: Record<string, unknown>;
  tags: string[];
}

export interface PentestReport {
  id: string;
  title: string;
  client: string;
  tester: string;
  scope: string;
  executiveSummary: string;
  createdAt: string;
  updatedAt: string;
  activityIds: string[];
  visibleIds: string[];
}

export interface ReconFinding {
  label: string;
  value: string;
  severity: string;
}

export interface ReconResult {
  kind: string;
  target: string;
  success: boolean;
  findings: ReconFinding[];
  rawOutput: string;
  durationMs: number;
}

export interface Engagement {
  id: string;
  name: string;
  client: string;
  status: string;
  scopeTargets: string[];
  outOfScope: string[];
  authorizedBy: string;
  authorizationRef: string;
  authorizationDate: string;
  startDate: string;
  endDate: string;
  rulesOfEngagement: string;
  emergencyContact: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveEngagement {
  engagementId?: string;
}

export interface WorkspaceTarget {
  id: string;
  host: string;
  ports: number[];
  services: string[];
  source: string;
  notes: string;
  addedAt: string;
}

export interface PentestWorkspace {
  engagementId?: string;
  primaryTarget: string;
  targets: WorkspaceTarget[];
  urls: string[];
  domains: string[];
  phaseStatus: Record<string, string>;
  sharedNotes: string;
  updatedAt: string;
}

export interface PipelineSummary {
  engagementActive: boolean;
  engagementName?: string;
  primaryTarget: string;
  targetsDiscovered: number;
  domainsCount: number;
  urlsCount: number;
  lootCount: number;
  activitiesTotal: number;
  reportsCount: number;
  phaseCounts: Record<string, number>;
  phaseStatus: Record<string, string>;
}

export interface LootItem {
  id: string;
  engagementId?: string;
  kind: string;
  title: string;
  value: string;
  target: string;
  source: string;
  sourceId?: string;
  severity: string;
  tags: string[];
  capturedAt: string;
  notes: string;
}

export interface PentestPhase {
  id: string;
  label: string;
  desc: string;
  path: string;
  icon: string;
  color: string;
}

export interface DefenseAsset {
  id: string;
  hostname: string;
  ip?: string;
  criticality: string;
  owner: string;
  lastScore?: number;
  openPorts: number[];
  vulnCount: number;
  source: string;
  notes: string;
  addedAt: string;
  updatedAt: string;
}

export interface DefenseWorkspace {
  engagementId?: string;
  primaryAsset: string;
  assets: DefenseAsset[];
  protectedNetworks: string[];
  phaseStatus: Record<string, string>;
  complianceNotes: string;
  updatedAt: string;
}

export interface DefensePipelineSummary {
  engagementActive: boolean;
  engagementName?: string;
  primaryAsset: string;
  assetsRegistered: number;
  networksProtected: number;
  scansTotal: number;
  vulnerabilitiesTotal: number;
  criticalVulns: number;
  pendingHardening: number;
  responseEvents: number;
  reportsCount: number;
  averageScore: number;
  phaseCounts: Record<string, number>;
  phaseStatus: Record<string, string>;
}

