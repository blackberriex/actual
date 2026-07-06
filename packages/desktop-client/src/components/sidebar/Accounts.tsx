import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSyncedPref } from '#hooks/useSyncedPref';
import { currentDay } from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { send } from '@actual-app/core/platform/client/connection';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useMoveAccountMutation } from '#accounts';
import { isAccountFailedSync } from '#accounts/syncStatus';
import { useAccounts } from '#hooks/useAccounts';
import { useClosedAccounts } from '#hooks/useClosedAccounts';
import { useLocalPref } from '#hooks/useLocalPref';
import { useOffBudgetAccounts } from '#hooks/useOffBudgetAccounts';
import { useOnBudgetAccounts } from '#hooks/useOnBudgetAccounts';
import { useUpdatedAccounts } from '#hooks/useUpdatedAccounts';
import { useSelector } from '#redux';
import * as bindings from '#spreadsheet/bindings';

import { Account } from './Account';
import { SecondaryItem } from './SecondaryItem';

const fontWeight = 600;

export function Accounts() {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const { data: accounts = [] } = useAccounts();
  const updatedAccounts = useUpdatedAccounts();
  const { data: offbudgetAccounts = [] } = useOffBudgetAccounts();
  const { data: onBudgetAccounts = [] } = useOnBudgetAccounts();
  const { data: closedAccounts = [] } = useClosedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);

  const getAccountPath = (account: AccountEntity) => `/accounts/${account.id}`;

  const [showClosedAccounts, setShowClosedAccountsPref] = useLocalPref(
    'ui.showClosedAccounts',
  );

  const [nbuUsdRateDate, setNbuUsdRateDate] = useSyncedPref('nbu_usd_rate_date');
  const [, setNbuUsdRate] = useSyncedPref('nbu_usd_rate');

  const [pbUsdRateDate, setPbUsdRateDate] = useSyncedPref('pb_usd_rate_date');
  const [, setPbUsdSaleRate] = useSyncedPref('pb_usd_sale_rate');
  const [, setPbUsdPurchaseRate] = useSyncedPref('pb_usd_purchase_rate');

  // Fetch NBU USD rate daily
  useEffect(() => {
    const todayStr = currentDay();
    if (nbuUsdRateDate === todayStr) {
      return;
    }

    async function fetchRate() {
      try {
        const response = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json');
        if (!response.ok) return;
        const data = await response.json();
        const rate = data?.[0]?.rate;
        if (rate) {
          setNbuUsdRate(String(rate));
          setNbuUsdRateDate(todayStr);
        }
      } catch (e) {
        console.error('Failed to fetch NBU exchange rate in sidebar:', e);
      }
    }

    const timer = setTimeout(fetchRate, 2000);
    return () => clearTimeout(timer);
  }, [nbuUsdRateDate, setNbuUsdRate, setNbuUsdRateDate]);

  // Fetch PrivatBank USD rates daily
  useEffect(() => {
    const todayStr = currentDay();
    if (pbUsdRateDate === todayStr) {
      return;
    }

    async function fetchPbRates() {
      try {
        const res = await send('tools/pb-exchange-rate', { date: todayStr });
        if (res && res.purchaseRate && res.saleRate) {
          setPbUsdSaleRate(String(res.saleRate));
          setPbUsdPurchaseRate(String(res.purchaseRate));
          setPbUsdRateDate(todayStr);
        }
      } catch (e) {
        console.error('Failed to fetch PrivatBank exchange rates in sidebar:', e);
      }
    }

    const timer = setTimeout(fetchPbRates, 4000);
    return () => clearTimeout(timer);
  }, [pbUsdRateDate, setPbUsdSaleRate, setPbUsdPurchaseRate, setPbUsdRateDate]);

  // Background transfer rate conversions (UAH -> USD)
  useEffect(() => {
    if (accounts.length === 0) return;

    const usdAccount = accounts.find(a => !a.closed && a.name?.toLowerCase().includes('usd'));
    if (!usdAccount) return;

    let isCancelled = false;

    async function checkAndConvertTransfers() {
      try {
        const usdResult = await send('query', q('transactions')
          .filter({ account: usdAccount.id })
          .select(['id', 'amount', 'date', 'transfer_id'])
        );
        const usdTxes = usdResult?.data || [];

        for (const usdTx of usdTxes) {
          if (isCancelled) break;
          if (!usdTx.transfer_id) continue;

          const linkResult = await send('query', q('transactions')
            .filter({ id: usdTx.transfer_id })
            .select(['id', 'amount', 'account'])
          );
          const linkTx = linkResult?.data?.[0];
          if (!linkTx) continue;

          const linkAccount = accounts.find(a => a.id === linkTx.account);
          const isLinkUah = linkAccount && !linkAccount.name?.toLowerCase().includes('usd');

          if (isLinkUah) {
            if (Math.abs(usdTx.amount) === Math.abs(linkTx.amount) && usdTx.amount !== 0) {
              console.log(`[Transfer] Found UAH->USD transfer to convert: Date=${usdTx.date}, UAH cents=${linkTx.amount}`);
              
              const pbRate = await send('tools/pb-exchange-rate', { date: usdTx.date });
              const rate = pbRate?.purchaseRate;
              
              if (rate && rate > 0) {
                const targetCents = Math.round(usdTx.amount / rate);
                console.log(`[Transfer] Converting to USD cents: ${usdTx.amount} -> ${targetCents} at rate ${rate}`);
                
                await send('transactions-batch-update', {
                  updated: [{ id: usdTx.id, amount: targetCents }]
                });
              } else {
                console.warn(`[Transfer] Could not fetch PrivatBank purchase rate for date ${usdTx.date}`);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to run transfer conversion check:', e);
      }
    }

    const initialTimer = setTimeout(checkAndConvertTransfers, 5000);
    const interval = setInterval(checkAndConvertTransfers, 30000);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [accounts]);

  function onDragChange(drag: { state: string }) {
    setIsDragging(drag.state === 'start');
  }

  const moveAccount = useMoveAccountMutation();

  const makeDropPadding = (i: number) => {
    if (i === 0) {
      return {
        paddingTop: isDragging ? 15 : 0,
        marginTop: isDragging ? -15 : 0,
      };
    }
    return undefined;
  };

  async function onReorder(
    id: string,
    dropPos: 'top' | 'bottom' | null,
    targetId: string,
  ) {
    let targetIdToMove: string | null = targetId;
    if (dropPos === 'bottom') {
      const idx = accounts.findIndex(a => a.id === targetId) + 1;
      targetIdToMove = idx < accounts.length ? accounts[idx].id : null;
    }

    moveAccount.mutate({ id, targetId: targetIdToMove });
  }

  const onToggleClosedAccounts = () => {
    setShowClosedAccountsPref(!showClosedAccounts);
  };

  return (
    <View
      style={{
        flexGrow: 1,
        '@media screen and (max-height: 480px)': {
          minHeight: 'auto',
        },
      }}
    >
      <View
        style={{
          height: 1,
          backgroundColor: theme.sidebarBorder,
          margin: '12px 16px 8px 16px',
          flexShrink: 0,
        }}
      />

      <View style={{ overflow: 'auto' }}>
        <Account
          name={t('All accounts')}
          to="/accounts"
          query={bindings.allAccountBalance()}
          style={{ fontWeight, marginTop: 8 }}
          balanceStyle={{ color: theme.sidebarItemTextHighlight }}
          isExactPathMatch
          balanceTestId="sidebar-all-accounts-balance"
        />

        {onBudgetAccounts.length > 0 && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: theme.sidebarBorder,
                margin: '14px 16px 8px 16px',
                flexShrink: 0,
              }}
            />
            <Account
              name={t('On budget')}
              to="/accounts/onbudget"
              query={bindings.onBudgetAccountBalance()}
              style={{
                fontWeight,
                marginBottom: 5,
              }}
              titleAccount
              balanceTestId="sidebar-on-budget-balance"
            />
          </>
        )}

        {onBudgetAccounts.map((account, i) => (
          <Account
            key={account.id}
            name={account.name}
            account={account}
            connected={!!account.bank}
            pending={syncingAccountIds.includes(account.id)}
            failed={isAccountFailedSync(account)}
            updated={updatedAccounts.includes(account.id)}
            to={getAccountPath(account)}
            query={bindings.accountBalance(account.id)}
            onDragChange={onDragChange}
            onDrop={onReorder}
            outerStyle={makeDropPadding(i)}
          />
        ))}

        {offbudgetAccounts.length > 0 && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: theme.sidebarBorder,
                margin: '14px 16px 8px 16px',
                flexShrink: 0,
              }}
            />
            <Account
              name={t('Off budget')}
              to="/accounts/offbudget"
              query={bindings.offBudgetAccountBalance()}
              style={{
                fontWeight,
                marginBottom: 5,
              }}
              titleAccount
              balanceTestId="sidebar-off-budget-balance"
            />
          </>
        )}

        {offbudgetAccounts.map((account, i) => (
          <Account
            key={account.id}
            name={account.name}
            account={account}
            connected={!!account.bank}
            pending={syncingAccountIds.includes(account.id)}
            failed={isAccountFailedSync(account)}
            updated={updatedAccounts.includes(account.id)}
            to={getAccountPath(account)}
            query={bindings.accountBalance(account.id)}
            onDragChange={onDragChange}
            onDrop={onReorder}
            outerStyle={makeDropPadding(i)}
          />
        ))}

        {closedAccounts.length > 0 && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: theme.sidebarBorder,
                margin: '14px 16px 8px 16px',
                flexShrink: 0,
              }}
            />
            <SecondaryItem
              title={
                showClosedAccounts
                  ? t('Closed accounts')
                  : t('Closed accounts...')
              }
              onClick={onToggleClosedAccounts}
              bold
            />
          </>
        )}

        {showClosedAccounts &&
          closedAccounts.map(account => (
            <Account
              key={account.id}
              name={account.name}
              account={account}
              to={getAccountPath(account)}
              query={bindings.accountBalance(account.id)}
              onDragChange={onDragChange}
              onDrop={onReorder}
            />
          ))}
      </View>
    </View>
  );
}
