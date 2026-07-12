import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { Page } from './Page';

type LogEntry = {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  type: 'sync' | 'rate' | 'system';
  message: string;
  details?: string;
};

export function Logs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await send('tools/logs');
      if (result && !result.error) {
        setLogs(result.logs || []);
        setLastSyncTime(result.lastSyncTime || null);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Poll logs and sync state while syncing is in progress
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isSyncing) {
      intervalId = setInterval(async () => {
        try {
          const result = await send('tools/logs');
          if (result && !result.error) {
            setLogs(result.logs || []);
            setLastSyncTime(result.lastSyncTime || null);
            
            // Check if there is a log entry indicating completed or failed sync after the start of syncing
            const latestLog = result.logs?.[0];
            if (latestLog && latestLog.type === 'sync' && (latestLog.message.includes('completed') || latestLog.message.includes('failed'))) {
              setIsSyncing(false);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSyncing]);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await send('tools/logs-trigger-sync');
      fetchLogs();
    } catch (e) {
      console.error(e);
      setIsSyncing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredLogs = logs.filter(log => {
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesType && matchesLevel;
  });

  return (
    <Page header={t('Logs')}>
      <View style={{ flex: 1, padding: 10 }}>
        {/* Top Control Bar */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            gap: 10,
            flexWrap: 'wrap'
          }}
        >
          {/* Metadata & Controls */}
          <View style={{ flexDirection: 'column', gap: 5 }}>
            <Text style={{ fontSize: 13, color: theme.pageTextSubdued }}>
              {t('Last sync time')}:{' '}
              <Text style={{ fontWeight: 'bold', color: theme.pageText }}>
                {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : t('Never')}
              </Text>
            </Text>
          </View>

          {/* Sync Trigger and Refresh Buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              onPress={fetchLogs}
              isDisabled={isLoading}
              style={{
                backgroundColor: theme.buttonNormalBackground,
                color: theme.buttonNormalText,
                padding: '6px 12px',
                borderRadius: 4
              }}
            >
              {isLoading ? t('Loading...') : t('Refresh')}
            </Button>
            
            <Button
              onPress={handleSyncNow}
              isDisabled={isSyncing}
              style={{
                backgroundColor: isSyncing ? theme.buttonDisabledBackground : '#F4663A',
                color: '#ffffff',
                fontWeight: 'bold',
                padding: '6px 16px',
                borderRadius: 4,
                border: 'none',
                cursor: isSyncing ? 'not-allowed' : 'pointer'
              }}
            >
              {isSyncing ? t('Syncing...') : t('Sync Monobank')}
            </Button>
          </View>
        </View>

        {/* Filter Section */}
        <View
          style={{
            flexDirection: 'row',
            gap: 15,
            marginBottom: 15,
            padding: 10,
            backgroundColor: theme.tableBackground || theme.cardBackground,
            borderRadius: 6,
            border: '1px solid ' + theme.tableBorder
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: theme.pageTextSubdued }}>{t('Type')}:</Text>
            {['all', 'sync', 'rate', 'system'].map(type => (
              <Button
                key={type}
                onPress={() => setTypeFilter(type)}
                style={{
                  padding: '3px 8px',
                  fontSize: 12,
                  borderRadius: 3,
                  backgroundColor: typeFilter === type ? theme.buttonPrimaryBackground : 'transparent',
                  color: typeFilter === type ? theme.buttonPrimaryText : theme.pageTextSubdued,
                  border: '1px solid ' + (typeFilter === type ? theme.buttonPrimaryBackground : theme.tableBorder)
                }}
              >
                {type.toUpperCase()}
              </Button>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: theme.pageTextSubdued }}>{t('Level')}:</Text>
            {['all', 'info', 'warn', 'error'].map(level => (
              <Button
                key={level}
                onPress={() => setLevelFilter(level)}
                style={{
                  padding: '3px 8px',
                  fontSize: 12,
                  borderRadius: 3,
                  backgroundColor: levelFilter === level ? theme.buttonPrimaryBackground : 'transparent',
                  color: levelFilter === level ? theme.buttonPrimaryText : theme.pageTextSubdued,
                  border: '1px solid ' + (levelFilter === level ? theme.buttonPrimaryBackground : theme.tableBorder)
                }}
              >
                {level.toUpperCase()}
              </Button>
            ))}
          </View>
        </View>

        {/* Logs Listing */}
        <View
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid ' + theme.tableBorder,
            borderRadius: 6,
            backgroundColor: theme.tableBackground || '#131313',
            fontFamily: 'monospace'
          }}
        >
          {filteredLogs.length === 0 ? (
            <View style={{ padding: 20, textAlign: 'center', color: theme.pageTextSubdued }}>
              {t('No logs found')}
            </View>
          ) : (
            filteredLogs.map((log) => {
              const levelColor =
                log.level === 'error'
                  ? '#ff4d4f'
                  : log.level === 'warn'
                  ? '#faad14'
                  : theme.pageText;
                  
              const typeLabelColor =
                log.type === 'sync'
                  ? '#1890ff'
                  : log.type === 'rate'
                  ? '#52c41a'
                  : '#722ed1';

              const isExpanded = !!expandedLogs[log.id];

              return (
                <View
                  key={log.id}
                  style={{
                    borderBottom: '1px solid ' + theme.tableBorder,
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      backgroundColor: theme.tableRowBackgroundHover || 'rgba(255, 255, 255, 0.02)'
                    }
                  }}
                >
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      cursor: log.details ? 'pointer' : 'default'
                    }}
                    onClick={() => log.details && toggleExpand(log.id)}
                  >
                    {/* Date */}
                    <Text style={{ color: theme.pageTextSubdued, fontSize: 11 }}>
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </Text>

                    {/* Level */}
                    <Text
                      style={{
                        color: levelColor,
                        fontWeight: 'bold',
                        fontSize: 11,
                        minWidth: 45
                      }}
                    >
                      {log.level.toUpperCase()}
                    </Text>

                    {/* Type Badge */}
                    <View
                      style={{
                        backgroundColor: typeLabelColor + '22',
                        color: typeLabelColor,
                        padding: '1px 5px',
                        borderRadius: 3,
                        fontSize: 9,
                        fontWeight: 'bold',
                        border: '1px solid ' + typeLabelColor + '44'
                      }}
                    >
                      {log.type.toUpperCase()}
                    </View>

                    {/* Expand Indicator */}
                    {log.details && (
                      <Text style={{ color: theme.pageTextSubdued, fontSize: 11 }}>
                        {isExpanded ? '▼' : '▶'}
                      </Text>
                    )}

                    {/* Message */}
                    <Text style={{ flex: 1, fontSize: 12, color: theme.pageText }}>
                      {log.message}
                    </Text>
                  </View>

                  {/* Expanded details */}
                  {log.details && isExpanded && (
                    <View
                      style={{
                        marginTop: 8,
                        padding: 10,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        border: '1px solid ' + theme.tableBorder,
                        fontSize: 11,
                        color: theme.pageTextSubdued,
                        whiteSpace: 'pre-wrap',
                        overflowX: 'auto',
                        lineHeight: 1.4
                      }}
                    >
                      {log.details}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>
    </Page>
  );
}
