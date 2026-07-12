import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../load-config';

export type LogEntry = {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  type: 'sync' | 'rate' | 'system';
  message: string;
  details?: string;
};

export type SyncState = {
  lastSyncTime: string | null; // ISO string
};

const logsPath = path.join(config.get('dataDir'), 'vault_logs.json');
const syncStatePath = path.join(config.get('dataDir'), 'sync_state.json');

export function readLogs(): LogEntry[] {
  try {
    if (fs.existsSync(logsPath)) {
      const data = fs.readFileSync(logsPath, 'utf8');
      return JSON.parse(data) || [];
    }
  } catch (e) {
    console.error('Failed to read logs:', e);
  }
  return [];
}

export function writeLogs(logs: LogEntry[]) {
  try {
    // Keep max 500 logs
    const trimmed = logs.slice(0, 500);
    fs.writeFileSync(logsPath, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write logs:', e);
  }
}

export function appendLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
  const logs = readLogs();
  const newEntry: LogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  logs.unshift(newEntry); // Newest first
  writeLogs(logs);
}

export function readSyncState(): SyncState {
  try {
    if (fs.existsSync(syncStatePath)) {
      const data = fs.readFileSync(syncStatePath, 'utf8');
      return JSON.parse(data) || { lastSyncTime: null };
    }
  } catch (e) {
    console.error('Failed to read sync state:', e);
  }
  return { lastSyncTime: null };
}

export function writeSyncState(state: SyncState) {
  try {
    fs.writeFileSync(syncStatePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write sync state:', e);
  }
}
