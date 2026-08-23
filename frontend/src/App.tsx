import React, { useState, useEffect } from 'react';
import { Shell } from './components/layout/Shell';
import { NavTab } from './components/layout/Sidebar';
import { OverviewData, PipelineRun, AgentVersionInfo } from './types/agentguard';
import { AgentGuardAPI } from './services/api';
import { LoadingState } from './components/common/LoadingState';
import { ErrorState } from './components/common/ErrorState';

import { OverviewView } from './views/OverviewView';
import { PipelineView } from './views/PipelineView';
import { AgentVersionsView } from './views/AgentVersionsView';
import { ScenariosView } from './views/ScenariosView';
import { FailuresView } from './views/FailuresView';
import { GuardrailsView } from './views/GuardrailsView';
import { ScorecardView } from './views/ScorecardView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [currentVersion, setCurrentVersion] = useState<string>('v1.0.0');

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [activeRun, setActiveRun] = useState<PipelineRun | null>(null);
  const [versions, setVersions] = useState<AgentVersionInfo[]>([]);

  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      // 1. Health check
      await AgentGuardAPI.getHealth();
      setBackendConnected(true);

      // 2. Fetch Overview
      const overview = await AgentGuardAPI.getOverview(currentVersion);
      setOverviewData(overview);

      // 3. Fetch Pipeline Runs
      const pipelineRes = await AgentGuardAPI.getPipelineRuns();
      setRuns(pipelineRes.runs || []);
      if (pipelineRes.runs && pipelineRes.runs.length > 0) {
        setActiveRun(pipelineRes.runs[0]);
      }

      // 4. Fetch Versions
      const versionsRes = await AgentGuardAPI.getVersions();
      setVersions(versionsRes.versions || []);

    } catch (err: any) {
      console.error('Failed to load application data:', err);
      setBackendConnected(false);
      setErrorMsg(err.message || 'Could not connect to AgentGuard Backend API (127.0.0.1:8000).');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentVersion]);

  const handleRunPipeline = async (version: string = currentVersion, simulateRegression: boolean = false) => {
    setIsTriggering(true);
    try {
      const res = await AgentGuardAPI.startPipelineRun({
        agent_version: version,
        simulate_regression: simulateRegression,
      });

      // Poll status
      const statusRes = await AgentGuardAPI.getPipelineRunStatus(res.run_id);
      setActiveRun(statusRes);
      setActiveTab('pipeline');
      await loadData();
    } catch (err: any) {
      alert(`Pipeline trigger error: ${err.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSelectRun = async (runId: string) => {
    try {
      const statusRes = await AgentGuardAPI.getPipelineRunStatus(runId);
      setActiveRun(statusRes);
    } catch (err: any) {
      console.error('Error fetching run:', err);
    }
  };

  return (
    <Shell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentVersion={currentVersion}
      onVersionChange={setCurrentVersion}
      backendConnected={backendConnected}
      onRefresh={loadData}
      isRefreshing={isRefreshing}
      failureCount={overviewData?.summary.failures?.length || 0}
      guardrailViolationCount={overviewData?.summary.guardrail_violations?.length || 0}
    >
      {isLoading ? (
        <LoadingState label="Connecting to AgentGuard Python Engine..." />
      ) : errorMsg && !overviewData ? (
        <ErrorState message={errorMsg} onRetry={loadData} />
      ) : (
        <>
          {activeTab === 'overview' && overviewData && (
            <OverviewView
              data={overviewData}
              onNavigate={setActiveTab}
              onRunPipeline={() => handleRunPipeline(currentVersion, false)}
            />
          )}

          {activeTab === 'pipeline' && (
            <PipelineView
              runs={runs}
              activeRun={activeRun}
              onTriggerRun={(v, sim) => handleRunPipeline(v, sim)}
              onSelectRun={handleSelectRun}
              isTriggering={isTriggering}
            />
          )}

          {activeTab === 'versions' && (
            <AgentVersionsView versions={versions} />
          )}

          {activeTab === 'scenarios' && (
            <ScenariosView />
          )}

          {activeTab === 'failures' && (
            <FailuresView currentVersion={currentVersion} />
          )}

          {activeTab === 'guardrails' && (
            <GuardrailsView currentVersion={currentVersion} />
          )}

          {activeTab === 'scorecard' && (
            <ScorecardView currentVersion={currentVersion} />
          )}
        </>
      )}
    </Shell>
  );
};
