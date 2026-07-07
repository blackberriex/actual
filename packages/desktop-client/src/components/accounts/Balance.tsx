import React, { useRef } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowButtonRight1 } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { AccountEntity } from '@actual-app/core/types/models';
import { useHover } from 'usehooks-ts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useCachedSchedules } from '#hooks/useCachedSchedules';
import { useFormat } from '#hooks/useFormat';
import { useSelectedItems } from '#hooks/useSelected';
import { useSheetValue } from '#hooks/useSheetValue';
import { useAccounts } from '#hooks/useAccounts';
import { useSyncedPref } from '#hooks/useSyncedPref';
import * as bindings from '#spreadsheet/bindings';
import type { Binding } from '#spreadsheet';

type DetailedBalanceProps = {
  name: string;
  balance: number;
  isExactBalance?: boolean;
  formatter?: (value: number) => string;
};

function DetailedBalance({
  name,
  balance,
  isExactBalance = true,
  formatter,
}: DetailedBalanceProps) {
  const format = useFormat();
  return (
    <Text
      style={{
        borderRadius: 4,
        padding: '4px 6px',
        color: theme.pillText,
        backgroundColor: theme.pillBackground,
      }}
    >
      {name}{' '}
      <PrivacyFilter>
        <FinancialText style={{ fontWeight: 600 }}>
          {!isExactBalance && '~ '}
          {formatter ? formatter(balance) : format(balance, 'financial')}
        </FinancialText>
      </PrivacyFilter>
    </Text>
  );
}

type SelectedBalanceProps = {
  selectedItems: Set<string>;
  account?: AccountEntity;
};

export function SelectedBalance({
  selectedItems,
  account,
}: SelectedBalanceProps) {
  const { t } = useTranslation();

  const name = `selected-balance-${[...selectedItems].join('-')}`;

  const rows = useSheetValue<'balance', `selected-transactions-${string}`>({
    name: name as `selected-transactions-${string}`,
    query: q('transactions')
      .filter({
        id: { $oneof: [...selectedItems] },
        parent_id: { $oneof: [...selectedItems] },
      })
      .select('id'),
  });
  const ids = new Set((rows || []).map((r: { id: string }) => r.id));

  const finalIds = [...selectedItems].filter(id => !ids.has(id));
  let balance = useSheetValue<'balance', `selected-balance-${string}`>({
    name: (name + '-sum') as `selected-balance-${string}`,
    query: q('transactions')
      .filter({ id: { $oneof: finalIds } })
      .options({ splits: 'all' })
      .calculate({ $sum: '$amount' }),
  });

  let scheduleBalance = 0;

  const { isLoading, schedules = [] } = useCachedSchedules();

  if (isLoading) {
    return null;
  }

  let isExactBalance = true;

  for (const id of [...selectedItems].filter(isPreviewId)) {
    // Preview IDs are in the format `preview/<schedule_id>/<date>`
    const scheduleId = id.slice(8).split('/')[0];
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      // If a schedule is `between X and Y` then we calculate the average
      if (schedule._amountOp === 'isbetween') {
        isExactBalance = false;
      }

      if (!account || account.id === schedule._account) {
        scheduleBalance += getScheduledAmount(schedule._amount);
      } else {
        scheduleBalance -= getScheduledAmount(schedule._amount);
      }
    }
  }

  if (typeof balance !== 'number' && !scheduleBalance) {
    return null;
  } else {
    balance = (balance ?? 0) + scheduleBalance;
  }

  return (
    <DetailedBalance
      name={t('Selected balance:')}
      balance={balance}
      isExactBalance={isExactBalance}
    />
  );
}

type FilteredBalanceProps = {
  filteredAmount?: number | null;
};

function FilteredBalance({ filteredAmount }: FilteredBalanceProps) {
  const { t } = useTranslation();

  return (
    <DetailedBalance
      name={t('Filtered balance:')}
      balance={filteredAmount ?? 0}
      isExactBalance
    />
  );
}

type MoreBalancesProps = {
  balanceQuery: { name: `balance-query-${string}`; query: Query };
  account?: AccountEntity;
};

function MoreBalances({ balanceQuery, account }: MoreBalancesProps) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const [pbUsdSaleRate] = useSyncedPref('pb_usd_sale_rate');
  const usdAccount = accounts.find(a => !a.closed && a.name?.toLowerCase().includes('usd'));

  const cleared = useSheetValue<'balance', `balance-query-${string}-cleared`>({
    name: (balanceQuery.name + '-cleared') as `balance-query-${string}-cleared`,
    query: balanceQuery.query.filter({ cleared: true }),
  });
  const uncleared = useSheetValue<
    'balance',
    `balance-query-${string}-uncleared`
  >({
    name: (balanceQuery.name +
      '-uncleared') as `balance-query-${string}-uncleared`,
    query: balanceQuery.query.filter({ cleared: false }),
  });

  const usdCleared = useSheetValue<'balance', `balance-query-usd-cleared`>(
    usdAccount
      ? {
          name: 'balance-query-usd-cleared',
          query: q('transactions')
            .filter({ account: usdAccount.id, cleared: true })
            .calculate({ $sum: '$amount' }),
        }
      : null
  );
  const usdUncleared = useSheetValue<'balance', `balance-query-usd-uncleared`>(
    usdAccount
      ? {
          name: 'balance-query-usd-uncleared',
          query: q('transactions')
            .filter({ account: usdAccount.id, cleared: false })
            .calculate({ $sum: '$amount' }),
        }
      : null
  );

  let finalCleared = cleared ?? 0;
  let finalUncleared = uncleared ?? 0;

  const saleRate = pbUsdSaleRate ? parseFloat(pbUsdSaleRate) : 41.50;

  if (!account && usdAccount) {
    if (typeof cleared === 'number' && typeof usdCleared === 'number') {
      finalCleared = cleared - usdCleared + Math.round(usdCleared * saleRate);
    }
    if (typeof uncleared === 'number' && typeof usdUncleared === 'number') {
      finalUncleared = uncleared - usdUncleared + Math.round(usdUncleared * saleRate);
    }
  }

  const format = useFormat();
  const formatter = account && account.id === usdAccount?.id
    ? (val: number) => `${format(val, 'financial')}$`
    : undefined;

  return (
    <>
      <DetailedBalance name={t('Cleared total:')} balance={finalCleared} isExactBalance={true} formatter={formatter} />
      <DetailedBalance name={t('Uncleared total:')} balance={finalUncleared} isExactBalance={true} formatter={formatter} />
    </>
  );
}

type BalancesProps = {
  balanceQuery: { name: `balance-query-${string}`; query: Query };
  showExtraBalances: boolean;
  onToggleExtraBalances: () => void;
  account?: AccountEntity;
  isFiltered: boolean;
  filteredAmount?: number | null;
};

export function Balances({
  balanceQuery,
  showExtraBalances,
  onToggleExtraBalances,
  account,
  isFiltered,
  filteredAmount,
}: BalancesProps) {
  const selectedItems = useSelectedItems();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isButtonHovered = useHover(buttonRef as RefObject<HTMLButtonElement>);

  const { data: accounts = [] } = useAccounts();
  const [pbUsdSaleRate] = useSyncedPref('pb_usd_sale_rate');
  const usdAccount = accounts.find(a => !a.closed && a.name?.toLowerCase().includes('usd'));

  const usdAccountBalanceQuery = useMemo(() => {
    return usdAccount
      ? bindings.accountBalance(usdAccount.id)
      : { name: 'dummy-usd-balance', value: 0 };
  }, [usdAccount]);

  const usdBalanceVal = useSheetValue(usdAccountBalanceQuery);
  const format = useFormat();

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: -5,
        marginLeft: -5,
        gap: 10,
      }}
    >
      <Button
        ref={buttonRef}
        data-testid="account-balance"
        variant="bare"
        onPress={onToggleExtraBalances}
        style={{
          paddingTop: 1,
          paddingBottom: 1,
        }}
      >
        <CellValue
          binding={
            { ...balanceQuery, value: 0 } as Binding<
              'balance',
              `balance-query-${string}`
            >
          }
          type="financial"
        >
          {props => {
            let finalValue = props.value;
            const saleRate = pbUsdSaleRate ? parseFloat(pbUsdSaleRate) : 41.50;

            if (!account && usdAccount && typeof usdBalanceVal === 'number') {
              finalValue = props.value - usdBalanceVal + Math.round(usdBalanceVal * saleRate);
            }

            const formatter = account && account.id === usdAccount?.id
              ? (val: number) => `${format(val, 'financial')}$`
              : undefined;

            return (
              <CellValueText
                {...props}
                value={finalValue}
                formatter={formatter}
                style={{
                  fontSize: 22,
                  fontWeight: 400,
                  color:
                    finalValue < 0
                      ? theme.numberNegative
                      : finalValue > 0
                        ? theme.numberPositive
                        : theme.pageTextSubdued,
                }}
              />
            );
          }}
        </CellValue>

        <SvgArrowButtonRight1
          style={{
            width: 10,
            height: 10,
            marginLeft: 10,
            color: theme.pillText,
            transform: showExtraBalances ? 'rotateZ(180deg)' : 'rotateZ(0)',
            opacity:
              isButtonHovered || selectedItems.size > 0 || showExtraBalances
                ? 1
                : 0,
          }}
        />
      </Button>

      {showExtraBalances && <MoreBalances balanceQuery={balanceQuery} account={account} />}

      {selectedItems.size > 0 && (
        <SelectedBalance selectedItems={selectedItems} account={account} />
      )}
      {isFiltered && <FilteredBalance filteredAmount={filteredAmount} />}
    </View>
  );
}
