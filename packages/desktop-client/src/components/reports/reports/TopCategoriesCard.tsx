import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TopCategoriesWidget } from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { topCategoriesSpreadsheet } from '#components/reports/spreadsheets/top-categories-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';

const DEFAULT_COUNT = 6;

type TopCategoriesCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: TopCategoriesWidget['meta'];
  onMetaChange: (newMeta: TopCategoriesWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function TopCategoriesCard({
  widgetId: _widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: TopCategoriesCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data: categoryViews = { grouped: [], list: [] } } = useCategories();
  const categories = categoryViews.list;

  const params = useMemo(() => topCategoriesSpreadsheet(), []);
  const data = useReport('top-categories', params);

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const count = meta?.count ?? DEFAULT_COUNT;

  const { rows, total } = useMemo(() => {
    if (!data) {
      return { rows: [], total: 0 };
    }

    const categoryById = new Map(categories.map(c => [c.id, c]));

    // expenses only: drop income categories, flip sign to positive
    const spending = data.rows
      .filter(row => {
        const category = row.category ? categoryById.get(row.category) : null;
        return !category?.is_income && row.amount < 0;
      })
      .map(row => ({
        id: row.category,
        name: row.category
          ? (categoryById.get(row.category)?.name ?? t('Unknown'))
          : t('Uncategorized'),
        amount: -row.amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = spending.reduce((sum, row) => sum + row.amount, 0);
    const top = spending.slice(0, count);
    const otherAmount = spending
      .slice(count)
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      rows:
        otherAmount > 0
          ? [...top, { id: '__other__', name: t('Other'), amount: otherAmount }]
          : top,
      total,
    };
  }, [data, categories, count, t]);

  const maxAmount = rows.length ? rows[0].amount : 0;

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
              name={meta?.name || t('Top categories')}
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
            {data && <DateRange start={data.start} end={data.end} />}
          </View>
          {data && (
            <View style={{ textAlign: 'right' }}>
              <View
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  color: theme.pageText,
                }}
              >
                <PrivacyFilter>
                  <FinancialText>{format(total, 'financial')}</FinancialText>
                </PrivacyFilter>
              </View>
              <View
                style={{
                  ...styles.smallText,
                  color: theme.pageTextSubdued,
                }}
              >
                {t('Total spent')}
              </View>
            </View>
          )}
        </View>

        {data ? (
          rows.length ? (
            <View
              style={{
                flex: 1,
                marginTop: 12,
                gap: 8,
                overflowY: 'auto',
              }}
            >
              {rows.map(row => {
                const percent = total > 0 ? (row.amount / total) * 100 : 0;
                const barPercent =
                  maxAmount > 0 ? (row.amount / maxAmount) * 100 : 0;
                return (
                  <View key={row.id ?? row.name} style={{ flexShrink: 0 }}>
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
                          color: theme.pageText,
                        }}
                      >
                        <PrivacyFilter>
                          <FinancialText>
                            {format(row.amount, 'financial')}
                          </FinancialText>
                        </PrivacyFilter>
                      </View>
                      <View
                        style={{
                          ...styles.smallText,
                          color: theme.pageTextSubdued,
                          width: 42,
                          textAlign: 'right',
                        }}
                      >
                        <FinancialText>{percent.toFixed(1)}%</FinancialText>
                      </View>
                    </View>
                    <View
                      style={{
                        marginTop: 3,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: theme.tableBorder,
                      }}
                    >
                      <View
                        style={{
                          width: `${barPercent}%`,
                          height: '100%',
                          borderRadius: 2,
                          backgroundColor: theme.pageTextSubdued,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                color: theme.pageTextSubdued,
                ...styles.smallText,
              }}
            >
              {t('No spending this month')}
            </View>
          )
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
