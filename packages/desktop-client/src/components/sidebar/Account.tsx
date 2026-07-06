// @ts-strict-ignore
import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { useQuery } from '#hooks/useQuery';
import { q } from '@actual-app/core/shared/query';
import { currentDay } from '@actual-app/core/shared/months';
import { send } from '@actual-app/core/platform/client/connection';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Button } from '@actual-app/components/button';
import {
  SvgArrowButtonDown1,
  SvgArrowButtonUp1,
} from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';

import { useReopenAccountMutation, useUpdateAccountMutation } from '#accounts';
import { BalanceHistoryGraph } from '#components/accounts/BalanceHistoryGraph';
import { Link } from '#components/common/Link';
import { Notes } from '#components/Notes';
import { DropHighlight, useDraggable, useDroppable } from '#components/sort';
import type { OnDragChangeCallback, OnDropCallback } from '#components/sort';
import { CellValue } from '#components/spreadsheet/CellValue';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useContextMenu } from '#hooks/useContextMenu';
import { useDragRef } from '#hooks/useDragRef';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useNotes } from '#hooks/useNotes';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useSheetValue } from '#hooks/useSheetValue';
import { useAccounts } from '#hooks/useAccounts';
import { useFormat } from '#hooks/useFormat';
import * as bindings from '#spreadsheet/bindings';
import { openAccountCloseModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import type { Binding, SheetFields } from '#spreadsheet';

export const accountNameStyle: CSSProperties = {
  display: 'block',
  marginTop: 1,
  marginBottom: 1,
  paddingTop: 5,
  paddingBottom: 5,
  paddingRight: 12,
  paddingLeft: 12,
  margin: '2px 8px',
  borderRadius: 6,
  textDecoration: 'none',
  color: theme.sidebarItemText,
  transition: 'background-color 150ms ease, color 150ms ease',
  ':hover': {
    backgroundColor: theme.sidebarItemBackgroundHover,
    color: theme.sidebarItemTextHighlight,
  },
  ...styles.smallText,
};

type AccountProps<FieldName extends SheetFields<'account'>> = {
  name: string;
  to: string;
  query: Binding<'account', FieldName>;
  account?: AccountEntity;
  connected?: boolean;
  pending?: boolean;
  failed?: boolean;
  updated?: boolean;
  style?: CSSProperties;
  outerStyle?: CSSProperties;
  onDragChange?: OnDragChangeCallback<{ id: string }>;
  onDrop?: OnDropCallback;
  titleAccount?: boolean;
  isExactPathMatch?: boolean;
  balanceTestId?: string;
  balanceStyle?: CSSProperties;
};

export function Account<FieldName extends SheetFields<'account'>>({
  name,
  account,
  connected,
  pending = false,
  failed,
  updated,
  to,
  query,
  style,
  outerStyle,
  onDragChange,
  onDrop,
  titleAccount,
  isExactPathMatch,
  balanceTestId,
  balanceStyle,
}: AccountProps<FieldName>) {
  const isTestEnv = useIsTestEnv();
  const { t } = useTranslation();
  const type = account
    ? account.closed
      ? 'account-closed'
      : account.offbudget
        ? 'account-offbudget'
        : 'account-onbudget'
    : 'title';

  const triggerRef = useRef(null);
  const { setMenuOpen, menuOpen, handleContextMenu, position } =
    useContextMenu();

  const { dragRef } = useDraggable({
    type,
    onDragChange,
    item: { id: account && account.id },
    canDrag: account != null,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: account ? [type] : [],
    id: account && account.id,
    onDrop,
  });

  const [showBalanceHistory, setShowBalanceHistory] = useSyncedPref(
    `side-nav.show-balance-history-${account?.id}`,
  );

  const dispatch = useDispatch();

  const [isEditing, setIsEditing] = useState(false);

  const accountNote = useNotes(`account-${account?.id}`);
  const isTouchDevice =
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  const needsTooltip = !!account?.id && !isTouchDevice;
  const reopenAccount = useReopenAccountMutation();
  const updateAccount = useUpdateAccountMutation();

  const isUsdAccount = account?.name?.toLowerCase().includes('usd');
  const [nbuUsdRate] = useSyncedPref('nbu_usd_rate');
  const [pbUsdSaleRate] = useSyncedPref('pb_usd_sale_rate');

  const { data: accounts } = useAccounts();
  const usdAccount = useMemo(() => {
    return accounts?.find(a => !a.closed && a.name?.toLowerCase().includes('usd'));
  }, [accounts]);

  const usdAccountBalanceQuery = useMemo(() => {
    return usdAccount ? bindings.accountBalance(usdAccount.id) : query;
  }, [usdAccount, query]);

  const usdBalanceVal = useSheetValue(usdAccountBalanceQuery);

  const isTotalRow = to === '/accounts' || to === '/accounts/onbudget' || to === '/accounts/offbudget';

  const showUahUsdEstimate =
    (to === '/accounts' ||
      to === '/accounts/onbudget' ||
      to === '/accounts/offbudget' ||
      (account && !account.closed)) &&
    !isUsdAccount;

  const balanceCell = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
      {isTotalRow ? (
        <UahTotalCell
          query={query}
          usdAccount={usdAccount}
          usdBalanceVal={usdBalanceVal}
          pbUsdSaleRate={pbUsdSaleRate}
          nbuUsdRate={nbuUsdRate}
        />
      ) : isUsdAccount ? (
        <USDBalanceCell query={query} />
      ) : (
        <>
          <CellValue binding={query} type="financial" />
          {showUahUsdEstimate && nbuUsdRate && (
            <EstimatedUSDBalance query={query} rate={nbuUsdRate} />
          )}
        </>
      )}
    </View>
  );

  const accountRow = (
    <View
      innerRef={dropRef}
      style={{ flexShrink: 0, ...outerStyle }}
      onContextMenu={needsTooltip ? handleContextMenu : undefined}
    >
      <View innerRef={triggerRef}>
        <DropHighlight pos={dropPos} />
        <View innerRef={handleDragRef}>
          <Link
            variant="internal"
            to={to}
            isDisabled={isEditing}
            isExactPathMatch={isExactPathMatch}
            style={
              titleAccount
                ? {
                    marginTop: 16,
                    marginBottom: 6,
                    paddingTop: 4,
                    paddingBottom: 4,
                    paddingLeft: 12,
                    paddingRight: 12,
                    margin: '0 8px',
                    textDecoration: 'none',
                    color: theme.pageTextSubdued,
                    textTransform: 'uppercase',
                    fontSize: 10,
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                    ':hover': { color: theme.sidebarItemTextSelected },
                  }
                : {
                    ...accountNameStyle,
                    ...style,
                    position: 'relative',
                    ...(updated && {
                      fontWeight: 600,
                      color: theme.sidebarItemTextUpdated,
                    }),
                  }
            }
            activeStyle={
              titleAccount
                ? {
                    color: theme.sidebarItemTextSelected,
                  }
                : {
                    backgroundColor: theme.sidebarItemAccentSelected,
                    color: theme.sidebarItemTextSelected,
                    fontWeight: (style && style.fontWeight) || 'normal',
                    ':hover': {
                      backgroundColor: theme.sidebarItemAccentSelected,
                      color: theme.sidebarItemTextSelected,
                    },
                  }
            }
          >
            {!titleAccount && (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <div
                  className={cx(
                    'dot',
                    css({
                      marginRight: 3,
                      width: 5,
                      height: 5,
                      borderRadius: 5,
                      backgroundColor: pending
                        ? theme.sidebarItemBackgroundPending
                        : failed
                          ? theme.sidebarItemBackgroundFailed
                          : theme.sidebarItemBackgroundPositive,
                      marginLeft: 2,
                      transition: 'transform .3s',
                      opacity: connected ? 1 : 0,
                    }),
                  )}
                />
              </View>
            )}

            <AlignedText
              left={
                isEditing ? (
                  <InitialFocus>
                    <Input
                      style={{
                        padding: 0,
                        width: '100%',
                      }}
                      onBlur={() => setIsEditing(false)}
                      onEnter={newAccountName => {
                        if (newAccountName.trim() !== '') {
                          updateAccount.mutate({
                            account: {
                              ...account,
                              name: newAccountName,
                            },
                          });
                        }
                        setIsEditing(false);
                      }}
                      onEscape={() => setIsEditing(false)}
                      defaultValue={name}
                    />
                  </InitialFocus>
                ) : (
                  name
                )
              }
              right={
                <View style={balanceStyle} data-testid={balanceTestId}>
                  {balanceCell}
                </View>
              }
            />
          </Link>
          {account && (
            <Popover
              triggerRef={triggerRef}
              placement="bottom start"
              isOpen={menuOpen}
              onOpenChange={() => setMenuOpen(false)}
              style={{ width: 200, margin: 1 }}
              isNonModal
              {...position}
            >
              <Menu
                onMenuSelect={type => {
                  switch (type) {
                    case 'close': {
                      void dispatch(
                        openAccountCloseModal({ accountId: account.id }),
                      );
                      break;
                    }
                    case 'reopen': {
                      reopenAccount.mutate({ id: account.id });
                      break;
                    }
                    case 'rename': {
                      setIsEditing(true);
                      break;
                    }
                    default: {
                      throw new Error(
                        `Unrecognized menu option: ${String(type)}`,
                      );
                    }
                  }
                  setMenuOpen(false);
                }}
                items={[
                  { name: 'rename', text: t('Rename') },
                  account.closed
                    ? { name: 'reopen', text: t('Reopen') }
                    : { name: 'close', text: t('Close') },
                ]}
              />
            </Popover>
          )}
        </View>
      </View>
    </View>
  );

  if (!needsTooltip || isTestEnv) {
    return accountRow;
  }

  return (
    <Tooltip
      content={
        <View
          style={{
            padding: 10,
          }}
        >
          <SpaceBetween
            gap={5}
            style={{
              justifyContent: 'space-between',
              '& .hover-visible': {
                opacity: 0,
                transition: 'opacity .25s',
              },
              '&:hover .hover-visible': {
                opacity: 1,
              },
            }}
          >
            <Text
              style={{
                fontWeight: 'bold',
              }}
            >
              {name}
            </Text>
            <Button
              aria-label={t('Toggle balance history')}
              variant="bare"
              onClick={() =>
                setShowBalanceHistory(
                  showBalanceHistory === 'true' ? 'false' : 'true',
                )
              }
              className="hover-visible"
            >
              <SpaceBetween gap={3}>
                {showBalanceHistory === 'true' ? (
                  <SvgArrowButtonUp1 width={10} height={10} />
                ) : (
                  <SvgArrowButtonDown1 width={10} height={10} />
                )}
              </SpaceBetween>
            </Button>
          </SpaceBetween>
          {showBalanceHistory === 'true' && account && (
            <BalanceHistoryGraph
              accountId={account.id}
              style={{ minWidth: 350, minHeight: 70 }}
            />
          )}
          {accountNote && (
            <Notes
              getStyle={() => ({
                borderTop: `1px solid ${theme.tableBorder}`,
                padding: 0,
                paddingTop: '0.5rem',
                marginTop: '0.5rem',
              })}
              notes={accountNote}
            />
          )}
        </View>
      }
      style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
      placement="right top"
      triggerProps={{
        delay: 1000,
        closeDelay: 250,
        isDisabled: menuOpen,
      }}
    >
      {accountRow}
    </Tooltip>
  );
}

function EstimatedUSDBalance({ query, rate }: { query: any; rate: string }) {
  const rawBalance = useSheetValue(query);
  if (typeof rawBalance !== 'number') return null;
  const usd = Math.round((rawBalance / 100) / parseFloat(rate));
  return (
    <span style={{ opacity: 0.6, fontSize: '0.9em', marginLeft: 2 }}>
      /{usd.toLocaleString()}$
    </span>
  );
}

function USDBalanceCell({ query }: { query: any }) {
  const rawBalance = useSheetValue(query);
  if (typeof rawBalance !== 'number') return null;
  const usd = rawBalance / 100;
  return (
    <span>
      {usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$
    </span>
  );
}

function UahTotalCell({
  query,
  usdAccount,
  usdBalanceVal,
  pbUsdSaleRate,
  nbuUsdRate,
}: {
  query: any;
  usdAccount: any;
  usdBalanceVal: any;
  pbUsdSaleRate: string;
  nbuUsdRate: string;
}) {
  const rawTotal = useSheetValue(query);
  const format = useFormat();

  if (typeof rawTotal !== 'number') return null;

  const saleRate = pbUsdSaleRate ? parseFloat(pbUsdSaleRate) : 41.50;
  const usdVal = typeof usdBalanceVal === 'number' ? usdBalanceVal : 0;
  const correctedCents = rawTotal - (usdAccount ? usdVal : 0) + Math.round((usdAccount ? usdVal : 0) * saleRate);

  const nbuRate = nbuUsdRate ? parseFloat(nbuUsdRate) : 40.80;
  const estimatedUsd = nbuRate > 0 ? Math.round((correctedCents / 100) / nbuRate) : 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <FinancialText style={{ whiteSpace: 'nowrap' }}>
        <PrivacyFilter activationFilters={[true]}>
          {format(correctedCents, 'financial')}
        </PrivacyFilter>
      </FinancialText>
      {nbuRate > 0 && (
        <span style={{ opacity: 0.6, fontSize: '0.9em', marginLeft: 2 }}>
          /{estimatedUsd.toLocaleString()}$
        </span>
      )}
    </View>
  );
}
