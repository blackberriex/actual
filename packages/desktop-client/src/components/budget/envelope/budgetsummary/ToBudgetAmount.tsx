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
        <View style={{ alignItems: 'center', marginTop: 2 }}>
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
            offset={5}
            triggerProps={{ isDisabled: isTotalsListTooltipDisabled }}
          >
            <PrivacyFilter
              style={{
                textAlign: 'center',
              }}
            >
              <View
                onClick={onClick}
                onContextMenu={onContextMenu}
                data-cellname={sheetName}
                className={css([
                  {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: isPositive
                      ? 'rgba(163, 222, 65, 0.08)'
                      : isNegative
                        ? 'rgba(225, 63, 77, 0.08)'
                        : 'rgba(110, 110, 119, 0.08)',
                    border: `1px solid ${
                      isPositive
                        ? 'rgba(163, 222, 65, 0.18)'
                        : isNegative
                          ? 'rgba(225, 63, 77, 0.18)'
                          : 'rgba(110, 110, 119, 0.18)'
                    }`,
                    borderRadius: 999,
                    padding: '4px 12px',
                    color: isPositive
                      ? theme.toBudgetPositive
                      : isNegative
                        ? theme.toBudgetNegative
                        : theme.toBudgetZero,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 150ms ease',
                    ':hover': {
                      backgroundColor: isPositive
                        ? 'rgba(163, 222, 65, 0.14)'
                        : isNegative
                          ? 'rgba(225, 63, 77, 0.14)'
                          : 'rgba(110, 110, 119, 0.14)',
                      transform: 'translateY(-0.5px)',
                    },
                    ':active': {
                      transform: 'scale(0.98)',
                    },
                  },
                  amountStyle,
                ])}
              >
                <Block style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.04em', opacity: 0.8, marginRight: 2 }}>
                  {isNegative ? t('Overbudgeted') : t('To Budget')}
                </Block>
                <FinancialText>{format(num, 'financial')}</FinancialText>
              </View>
            </PrivacyFilter>
          </Tooltip>
        </View>
      )}
    </View>
  );
}
