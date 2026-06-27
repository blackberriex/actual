import React from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useTrackingSheetValue } from '#components/budget/tracking/TrackingBudgetComponents';
import { makeAmountFullStyle } from '#components/budget/util';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { trackingBudget } from '#spreadsheet/bindings';

type SavedProps = {
  projected: boolean;
  style?: CSSProperties;
};
export function Saved({ projected, style }: SavedProps) {
  const { t } = useTranslation();
  const budgetedSaved =
    useTrackingSheetValue(trackingBudget.totalBudgetedSaved) || 0;
  const totalSaved = useTrackingSheetValue(trackingBudget.totalSaved) || 0;
  const format = useFormat();
  const saved = projected ? budgetedSaved : totalSaved;
  const isNegative = saved < 0;
  const diff = totalSaved - budgetedSaved;

  return (
    <View style={{ alignItems: 'center', ...style }}>
      <Tooltip
        style={{ ...styles.tooltip, fontSize: 14, padding: 10 }}
        content={
          <>
            <AlignedText
              left={t('Projected savings:')}
              right={
                <FinancialText style={makeAmountFullStyle(budgetedSaved)}>
                  {format(budgetedSaved, 'financial-with-sign')}
                </FinancialText>
              }
            />
            <AlignedText
              left={t('Difference:')}
              right={
                <FinancialText style={makeAmountFullStyle(diff)}>
                  {format(diff, 'financial-with-sign')}
                </FinancialText>
              }
            />
          </>
        }
        placement="bottom"
        triggerProps={{
          isDisabled: Boolean(projected),
        }}
      >
        <View>
          <PrivacyFilter>
            <View
              className={css({
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isNegative
                  ? 'rgba(225, 63, 77, 0.08)'
                  : 'rgba(163, 222, 65, 0.08)',
                border: `1px solid ${
                  isNegative
                    ? 'rgba(225, 63, 77, 0.18)'
                    : 'rgba(163, 222, 65, 0.18)'
                }`,
                borderRadius: 999,
                padding: '4px 12px',
                color: projected
                  ? theme.templateNumberUnderFunded
                  : isNegative
                    ? theme.budgetNumberNegative
                    : theme.templateNumberFunded,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'default',
                userSelect: 'none',
              })}
            >
              <Block style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.04em', opacity: 0.8, marginRight: 2 }}>
                {projected
                  ? t('Projected savings')
                  : isNegative
                    ? t('Overspent')
                    : t('Saved')}
              </Block>
              <FinancialText>{format(saved, 'financial')}</FinancialText>
            </View>
          </PrivacyFilter>
        </View>
      </Tooltip>
    </View>
  );
}
