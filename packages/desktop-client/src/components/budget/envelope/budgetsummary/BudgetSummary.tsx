import React, { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import {
  SvgArrowButtonDown1,
  SvgArrowButtonUp1,
} from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css } from '@emotion/css';

import { useEnvelopeBudget } from '#components/budget/envelope/EnvelopeBudgetContext';
import { NotesButton } from '#components/NotesButton';
import { useLocale } from '#hooks/useLocale';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useUndo } from '#hooks/useUndo';

import { BudgetMonthMenu } from './BudgetMonthMenu';
import { ToBudget } from './ToBudget';
import { TotalsList } from './TotalsList';

type BudgetSummaryProps = {
  month: string;
};
export const BudgetSummary = memo(({ month }: BudgetSummaryProps) => {
  const locale = useLocale();
  const {
    currentMonth,
    summaryCollapsed: collapsed,
    onBudgetAction,
    onToggleSummaryCollapse,
  } = useEnvelopeBudget();

  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const { showUndoNotification } = useUndo();

  function onMenuOpen() {
    setMenuOpen(true);
  }

  function onMenuClose() {
    setMenuOpen(false);
  }

  const prevMonthName = monthUtils.format(
    monthUtils.prevMonth(month),
    'MMM',
    locale,
  );

  const ExpandOrCollapseIcon = collapsed
    ? SvgArrowButtonDown1
    : SvgArrowButtonUp1;

  const displayMonth = monthUtils.format(month, "MMMM ''yy", locale);
  const { t } = useTranslation();

  return (
    <View
      data-testid="budget-summary"
      style={{
        backgroundColor:
          month === currentMonth
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        border: '1px solid ' + theme.cardBorder,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        borderRadius: 20,
        margin: '5px 4px',
        flex: 1,
        cursor: 'default',
        overflow: 'hidden',
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <View
          style={{
            padding: collapsed ? '12px 24px' : '24px 24px 24px 24px',
            ...(collapsed ? { margin: '0' } : { marginTop: 4 }),
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 14,
              top: collapsed ? 8 : 16,
            }}
          >
            <Button
              variant="bare"
              aria-label={
                collapsed
                  ? t('Expand month summary')
                  : t('Collapse month summary')
              }
              className="hover-visible"
              onPress={onToggleSummaryCollapse}
            >
              <ExpandOrCollapseIcon
                width={13}
                height={13}
                // The margin is to make it the exact same size as the dots button
                style={{ color: theme.pageTextLight, margin: 1 }}
              />
            </Button>
          </View>

          <div
            className={css([
              {
                textAlign: 'center',
                marginTop: 0,
                fontSize: 22,
                fontWeight: 500,
                fontFamily: 'var(--font-family-display)',
                letterSpacing: '-0.02em',
                textDecorationSkip: 'ink',
              },
              currentMonth === month && { fontWeight: 600 },
            ])}
          >
            {monthUtils.format(month, 'MMMM', locale)}
          </div>

          <View
            style={{
              position: 'absolute',
              right: 10,
              top: 0,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View>
              <NotesButton
                id={`budget-${month}`}
                width={15}
                height={15}
                tooltipPosition="bottom right"
                defaultColor={theme.pageTextLight}
              />
            </View>
            <View style={{ userSelect: 'none', marginLeft: 2 }}>
              <Button
                ref={triggerRef}
                variant="bare"
                aria-label={t('Menu')}
                onPress={onMenuOpen}
              >
                <SvgDotsHorizontalTriple
                  width={15}
                  height={15}
                  style={{ color: theme.pageTextLight }}
                />
              </Button>

              <Popover
                triggerRef={triggerRef}
                isOpen={menuOpen}
                onOpenChange={onMenuClose}
              >
                <BudgetMonthMenu
                  onCopyLastMonthBudget={() => {
                    onBudgetAction(month, 'copy-last');
                    onMenuClose();
                    showUndoNotification({
                      message: t(
                        "{{displayMonth}} budgets have all been set to last month's budgeted amounts.",
                        { displayMonth },
                      ),
                    });
                  }}
                  onSetBudgetsToZero={() => {
                    onBudgetAction(month, 'set-zero');
                    onMenuClose();
                    showUndoNotification({
                      message: t(
                        '{{displayMonth}} budgets have all been set to zero.',
                        { displayMonth },
                      ),
                    });
                  }}
                  onSetMonthsAverage={numberOfMonths => {
                    onBudgetAction(month, `set-${numberOfMonths}-avg`);
                    onMenuClose();
                    showUndoNotification({
                      message:
                        numberOfMonths === 12
                          ? t(
                              `${displayMonth} budgets have all been set to yearly average.`,
                            )
                          : t(
                              `${displayMonth} budgets have all been set to ${numberOfMonths} month average.`,
                            ),
                    });
                  }}
                  onCheckTemplates={() => {
                    onBudgetAction(month, 'check-templates');
                    onMenuClose();
                  }}
                  onApplyBudgetTemplates={() => {
                    onBudgetAction(month, 'apply-goal-template');
                    onMenuClose();
                    showUndoNotification({
                      message: t(
                        '{{displayMonth}} budget templates have been applied.',
                        { displayMonth },
                      ),
                    });
                  }}
                  onOverwriteWithBudgetTemplates={() => {
                    onBudgetAction(month, 'overwrite-goal-template');
                    onMenuClose();
                    showUndoNotification({
                      message: t(
                        '{{displayMonth}} budget templates have been overwritten.',
                        { displayMonth },
                      ),
                    });
                  }}
                  onEndOfMonthCleanup={() => {
                    onBudgetAction(month, 'cleanup-goal-template');
                    onMenuClose();
                    showUndoNotification({
                      message: t(
                        '{{displayMonth}} end-of-month cleanup templates have been applied.',
                        { displayMonth },
                      ),
                    });
                  }}
                />
              </Popover>
            </View>
          </View>
        </View>

        {collapsed ? (
          <View
            style={{
              alignItems: 'center',
              padding: '10px 20px',
              justifyContent: 'space-between',
              backgroundColor: theme.budgetCurrentMonth,
              borderTop: '1px solid ' + theme.tableBorder,
            }}
          >
            <ToBudget
              prevMonthName={prevMonthName}
              month={month}
              onBudgetAction={onBudgetAction}
              isCollapsed
            />
          </View>
        ) : (
          <>
            <TotalsList
              prevMonthName={prevMonthName}
              style={{
                padding: '5px 0',
                marginTop: 17,
                backgroundColor: theme.budgetHeaderCurrentMonth,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.tableBorder,
              }}
            />
            <View style={{ margin: '23px 0' }}>
              <ToBudget
                prevMonthName={prevMonthName}
                month={month}
                onBudgetAction={onBudgetAction}
              />
            </View>
          </>
        )}
      </SheetNameProvider>
    </View>
  );
});

BudgetSummary.displayName = 'EnvelopeBudgetSummary';
