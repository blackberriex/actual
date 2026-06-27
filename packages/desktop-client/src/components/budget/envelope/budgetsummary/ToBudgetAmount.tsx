import React from 'react';
import type { CSSProperties, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  useEnvelopeSheetName,
  useEnvelopeSheetValue,
} from '#components/budget/envelope/EnvelopeBudgetComponents';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { envelopeBudget } from '#spreadsheet/bindings';

import { TotalsList } from './TotalsList';

type ToBudgetAmountProps = {
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick: () => void;
  onContextMenu?: MouseEventHandler;
  isTotalsListTooltipDisabled?: boolean;
  isCollapsed?: boolean;
};

export function ToBudgetAmount({
  prevMonthName,
  style,
  amountStyle,
  onClick,
  isTotalsListTooltipDisabled = false,
  onContextMenu,
  isCollapsed = false,
}: ToBudgetAmountProps) {
  const { t } = useTranslation();
  const sheetName = useEnvelopeSheetName(envelopeBudget.toBudget);
  const sheetValue = useEnvelopeSheetValue({
    name: envelopeBudget.toBudget,
    value: 0,
  });
  const format = useFormat();
  const availableValue = sheetValue;
  if (typeof availableValue !== 'number' && availableValue !== null) {
    throw new Error(
      'Expected availableValue to be a number but got ' + availableValue,
    );
  }
  const num = availableValue ?? 0;
  const isNegative = num < 0;
  const isPositive = num > 0;

  return (
    <View style={{ alignItems: 'center', ...style }}>
      {isCollapsed ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Block style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
            {isNegative ? t('Overbudgeted:') : t('To Budget:')}
          </Block>
          <Block
            onClick={onClick}
            onContextMenu={onContextMenu}
            data-cellname={sheetName}
            className={css([
              styles.smallText,
              {
                fontWeight: 600,
                userSelect: 'none',
                cursor: 'pointer',
                color: isPositive
                  ? theme.toBudgetPositive
                  : isNegative
                    ? theme.toBudgetNegative
                    : theme.toBudgetZero,
              },
              amountStyle,
            ])}
          >
            <FinancialText>{format(num, 'financial')}</FinancialText>
          </Block>
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <Block
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: theme.pageTextSubdued,
              marginBottom: 4,
            }}
          >
            {isNegative ? t('Overbudgeted') : t('To Budget')}
          </Block>
          <Tooltip
            content={
              <TotalsList
                prevMonthName={prevMonthName}
                style={{
                  padding: 7,
                }}
              />
            }
            placement="bottom"
            offset={3}
            triggerProps={{ isDisabled: isTotalsListTooltipDisabled }}
          >
            <PrivacyFilter
              style={{
                textAlign: 'center',
              }}
            >
              <Block
                onClick={onClick}
                onContextMenu={onContextMenu}
                data-cellname={sheetName}
                className={css([
                  {
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-family-display)',
                    userSelect: 'none',
                    cursor: 'pointer',
                    color: isPositive
                      ? theme.toBudgetPositive
                      : isNegative
                        ? theme.toBudgetNegative
                        : theme.toBudgetZero,
                    marginBottom: -1,
                    borderBottom: '1px solid transparent',
                    ':hover': {
                      borderColor: isPositive
                        ? theme.toBudgetPositive
                        : isNegative
                          ? theme.toBudgetNegative
                          : theme.toBudgetZero,
                    },
                  },
                  amountStyle,
                ])}
              >
                <FinancialText>{format(num, 'financial')}</FinancialText>
              </Block>
            </PrivacyFilter>
          </Tooltip>
        </View>
      )}
    </View>
  );
}
