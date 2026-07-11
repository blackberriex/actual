import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import type {
  RecurringStatusWidget,
  ScheduleEntity,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CategorySelector } from '#components/reports/CategorySelector';
import { NON_DRAGGABLE_AREA_CLASS_NAME } from '#components/reports/constants';
import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { recurringSpentSpreadsheet } from '#components/reports/spreadsheets/recurring-status-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { send } from '@actual-app/core/platform/client/connection';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { getSchedulesQuery, useSchedules } from '#hooks/useSchedules';
import { usePayeesById } from '#hooks/usePayees';
import { useAccounts } from '#hooks/useAccounts';

function getScheduleCategory(schedule: ScheduleEntity): string | null {
  const actions = schedule._actions;
  if (!Array.isArray(actions)) {
    return null;
  }
  const setCategory = actions.find(
    action =>
      action &&
      typeof action === 'object' &&
      'op' in action &&
      action.op === 'set' &&
      'field' in action &&
      action.field === 'category',
  );
  return setCategory && 'value' in setCategory
    ? (setCategory.value as string)
    : null;
}

type RecurringStatusCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: RecurringStatusWidget['meta'];
  onMetaChange: (newMeta: RecurringStatusWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function RecurringStatusCard({
  widgetId: _widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: RecurringStatusCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data: categoryViews = { grouped: [], list: [] } } = useCategories();
  const { list: categories, grouped: categoryGroups } = categoryViews;
  const { data: payeesById = {} } = usePayeesById();
  const { data: accounts = [] } = useAccounts();

  const [pbPurchaseRate, setPbPurchaseRate] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function getRate() {
      try {
        const todayStr = monthUtils.currentDay();
        const res = await send('tools/pb-exchange-rate', { date: todayStr });
        if (res && res.purchaseRate && active) {
          setPbPurchaseRate(res.purchaseRate);
        }
      } catch (e) {
        console.error('Failed to fetch PrivatBank exchange rate in RecurringStatusCard:', e);
      }
    }
    getRate();
    return () => {
      active = false;
    };
  }, []);

  const categoryIds = useMemo(
    () => meta?.categoryIds ?? [],
    [meta?.categoryIds],
  );

  const spentParams = useMemo(
    () => recurringSpentSpreadsheet(categoryIds),
    [categoryIds],
  );
  const spentData = useReport('recurring-spent', spentParams);

  const schedulesQuery = useMemo(() => getSchedulesQuery(), []);
  const { schedules, statuses, isLoading: schedulesLoading } = useSchedules({
    query: schedulesQuery,
  });

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const currentMonth = monthUtils.currentMonth();

  const { rowsByCategory, totalPaid, totalRemaining } = useMemo(() => {
    const idSet = new Set(categoryIds);
    const categoryById = new Map(categories.map(c => [c.id, c]));

    const paidByCategory = new Map<string, number>();
    for (const row of spentData?.rows ?? []) {
      if (row.category && idSet.has(row.category)) {
        paidByCategory.set(row.category, -row.amount);
      }
    }

    const rate = pbPurchaseRate || 40.5;

    // schedules still due this month in the selected categories;
    // category comes from the rule's set-category action or, failing that,
    // from the newest categorized transaction linked to the schedule
    const inferredCategories = spentData?.scheduleCategories ?? {};
    const remainingByCategory = new Map<string, number>();
    const schedulesBreakdownByCategory = new Map<string, { id: string; name: string; amount: number; date: string; isPaid: boolean }[]>();

    for (const schedule of schedules) {
      if (schedule.completed) continue;
      const scheduleCategory =
        getScheduleCategory(schedule) ?? inferredCategories[schedule.id];
      if (!scheduleCategory || !idSet.has(scheduleCategory)) continue;

      const account = accounts.find(a => a.id === schedule._account);
      const isUsd = account && account.name?.toLowerCase().includes('usd');
      const amount = getScheduledAmount(schedule._amount);
      if (amount >= 0) continue; // only expense schedules

      const expenseAmountUSD = -amount;
      const expenseAmountUAH = isUsd ? Math.round(expenseAmountUSD * rate) : expenseAmountUSD;

      const payeeName = schedule._payee && payeesById[schedule._payee]
        ? payeesById[schedule._payee].name
        : '';
      
      const originalAmountSuffix = isUsd ? ` ($${(expenseAmountUSD / 100).toFixed(2)})` : '';
      const displayName = (schedule.name || payeeName || t('Unknown schedule')) + originalAmountSuffix;

      // Check if it was paid this month
      const paidInfo = spentData?.paidSchedules?.[schedule.id];
      if (paidInfo) {
        if (!schedulesBreakdownByCategory.has(scheduleCategory)) {
          schedulesBreakdownByCategory.set(scheduleCategory, []);
        }
        schedulesBreakdownByCategory.get(scheduleCategory)!.push({
          id: schedule.id,
          name: displayName,
          amount: paidInfo.amount,
          date: paidInfo.date,
          isPaid: true,
        });
      } else {
        const nextDateMonth = schedule.next_date
          ? monthUtils.getMonth(schedule.next_date)
          : null;
        if (nextDateMonth === currentMonth) {
          const status = statuses.get(schedule.id);
          if (status !== 'paid' && status !== 'completed') {
            remainingByCategory.set(
              scheduleCategory,
              (remainingByCategory.get(scheduleCategory) ?? 0) + expenseAmountUAH,
            );

            if (!schedulesBreakdownByCategory.has(scheduleCategory)) {
              schedulesBreakdownByCategory.set(scheduleCategory, []);
            }
            schedulesBreakdownByCategory.get(scheduleCategory)!.push({
              id: schedule.id,
              name: displayName,
              amount: expenseAmountUAH,
              date: schedule.next_date,
              isPaid: false,
            });
          }
        }
      }
    }

    const rows = categoryIds.map(id => {
      const breakdown = schedulesBreakdownByCategory.get(id) ?? [];
      breakdown.sort((a, b) => a.date.localeCompare(b.date));
      return {
        id,
        name: categoryById.get(id)?.name ?? t('Unknown'),
        paid: paidByCategory.get(id) ?? 0,
        remaining: remainingByCategory.get(id) ?? 0,
        unpaidSchedules: breakdown,
      };
    });

    return {
      rowsByCategory: rows,
      totalPaid: rows.reduce((sum, row) => sum + row.paid, 0),
      totalRemaining: rows.reduce((sum, row) => sum + row.remaining, 0),
    };
  }, [categoryIds, categories, spentData, schedules, statuses, currentMonth, payeesById, accounts, pbPurchaseRate, t]);

  const isLoading = !spentData || schedulesLoading;

  const selectedCategories = useMemo(
    () => categories.filter(category => categoryIds.includes(category.id)),
    [categories, categoryIds],
  );

  const expenseCategoryGroups = useMemo(
    () => categoryGroups.filter(group => !group.is_income),
    [categoryGroups],
  );

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
        ...copyMenuItems,
      ]}
      onMenuSelect={item => {
        if (handleCopyMenuSelect(item)) return;
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View style={{ flex: 1, margin: 20, marginBottom: 12, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Recurring payments')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
            {spentData && (
              <DateRange start={spentData.start} end={spentData.end} />
            )}
          </View>
          <View className={NON_DRAGGABLE_AREA_CLASS_NAME}>
            <DialogTrigger>
              <Button variant="bare" style={{ color: theme.pageTextSubdued }}>
                {t('Categories')} ({categoryIds.length})
              </Button>
              <Popover>
                <Dialog>
                  <View
                    className={NON_DRAGGABLE_AREA_CLASS_NAME}
                    style={{
                      padding: 10,
                      width: 260,
                      maxHeight: 320,
                      overflowY: 'auto',
                    }}
                  >
                    <CategorySelector
                      categoryGroups={expenseCategoryGroups}
                      selectedCategories={selectedCategories}
                      setSelectedCategories={newSelection => {
                        onMetaChange({
                          ...meta,
                          categoryIds: newSelection.map(
                            category => category.id,
                          ),
                        });
                      }}
                      showHiddenCategories={false}
                    />
                  </View>
                </Dialog>
              </Popover>
            </DialogTrigger>
          </View>
        </View>

        {isLoading ? (
          <LoadingIndicator />
        ) : !categoryIds.length ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              color: theme.pageTextSubdued,
              ...styles.smallText,
            }}
          >
            {t('Select categories to track')}
          </View>
        ) : (
          <View style={{ flex: 1, marginTop: 8, overflow: 'hidden' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 12,
              }}
            >
              <View>
                <View
                  style={{
                    ...styles.veryLargeText,
                    fontWeight: 600,
                    color:
                      totalRemaining > 0
                        ? theme.reportsNumberNegative
                        : theme.reportsNumberPositive,
                  }}
                >
                  <PrivacyFilter>
                    <FinancialText>
                      {format(totalRemaining, 'financial')}
                    </FinancialText>
                  </PrivacyFilter>
                </View>
                <View
                  style={{
                    ...styles.smallText,
                    color: theme.pageTextSubdued,
                  }}
                >
                  {t('Left to pay this month')}
                </View>
              </View>
              <View style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <View style={{ ...styles.mediumText, color: theme.pageText }}>
                  <PrivacyFilter>
                    <FinancialText>
                      {format(totalPaid, 'financial')}
                    </FinancialText>
                  </PrivacyFilter>
                </View>
                <View
                  style={{
                    ...styles.smallText,
                    color: theme.pageTextSubdued,
                  }}
                >
                  {t('Paid of {{total}}', {
                    total: format(totalPaid + totalRemaining, 'financial'),
                  })}
                </View>
              </View>
            </View>

            <View
              style={{
                flex: 1,
                marginTop: 10,
                gap: 8,
                overflowY: 'auto',
                paddingRight: 8,
              }}
            >
              {rowsByCategory.map(row => (
                <View key={row.id} style={{ flexShrink: 0, gap: 2 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        ...styles.smallText,
                        flex: 1,
                        color: theme.pageText,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                      }}
                    >
                      {row.name}
                    </View>
                    <View
                      style={{
                        ...styles.smallText,
                        color: theme.pageTextSubdued,
                      }}
                    >
                      <PrivacyFilter>
                        <FinancialText>
                          {format(row.paid, 'financial')}
                        </FinancialText>
                      </PrivacyFilter>
                    </View>
                    <View
                      style={{
                        ...styles.smallText,
                        width: 76,
                        textAlign: 'right',
                        color:
                          row.remaining > 0
                            ? theme.reportsNumberNegative
                            : theme.pageTextSubdued,
                      }}
                    >
                      <PrivacyFilter>
                        <FinancialText>
                          {row.remaining > 0
                            ? format(row.remaining, 'financial')
                            : '✓'}
                        </FinancialText>
                      </PrivacyFilter>
                    </View>
                  </View>

                  {/* Breakdown of unpaid items in this category */}
                  {row.unpaidSchedules.map(item => {
                    const formattedDate = monthUtils.format(item.date, 'dd.MM');
                    return (
                      <View
                        key={item.id}
                        style={{
                          flexDirection: 'row',
                          paddingLeft: 12,
                          alignItems: 'baseline',
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            ...styles.verySmallText,
                            color: theme.pageTextSubdued,
                            flex: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                            textDecorationLine: item.isPaid ? 'line-through' : 'none',
                          }}
                        >
                          {item.isPaid ? '✓' : '•'} {formattedDate} — {item.name}
                        </View>
                        <View
                          style={{
                            ...styles.verySmallText,
                            color: item.isPaid ? theme.pageTextSubdued : theme.reportsNumberNegative,
                            width: 76,
                            textAlign: 'right',
                          }}
                        >
                          <PrivacyFilter>
                            <FinancialText>
                              {format(item.amount, 'financial')}
                            </FinancialText>
                          </PrivacyFilter>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ReportCard>
  );
}
