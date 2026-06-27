// @ts-strict-ignore
import React, { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
  SvgCheveronDown,
} from '@actual-app/components/icons/v1';
import { SvgCalendar } from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { Link } from '#components/common/Link';
import { useLocale } from '#hooks/useLocale';

import type { MonthBounds } from './MonthsContext';

type MonthPickerProps = {
  startMonth: string;
  numDisplayed: number;
  monthBounds: MonthBounds;
  style: CSSProperties;
  onSelect: (month: string) => void;
};

export const MonthPicker = ({
  startMonth,
  numDisplayed,
  monthBounds,
  style,
  onSelect,
}: MonthPickerProps) => {
  const locale = useLocale();
  const { t } = useTranslation();
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const currentMonth = monthUtils.currentMonth();
  const firstSelectedMonth = startMonth;
  const lastSelectedMonth = monthUtils.addMonths(
    firstSelectedMonth,
    numDisplayed - 1,
  );

  const currentYear = parseInt(monthUtils.getYear(startMonth));

  const size = 'big';

  // Dynamically build the list of months to render (always all 12 months)
  const monthsToRender: string[] = [];
  for (let i = 1; i <= 12; i++) {
    monthsToRender.push(`${currentYear}-${String(i).padStart(2, '0')}`);
  }

  const yearTriggerRef = useRef<HTMLButtonElement>(null);

  // Parse bounds and generate available years
  const startBoundYear = parseInt(monthUtils.getYear(monthBounds.start));
  const endBoundYear = parseInt(monthUtils.getYear(monthBounds.end));
  const years: number[] = [];
  for (
    let y = Math.min(startBoundYear, currentYear - 3);
    y <= Math.max(endBoundYear, currentYear + 3);
    y++
  ) {
    years.push(y);
  }

  const onYearSelect = (year: number) => {
    const monthPart = startMonth.split('-')[1];
    onSelect(`${year}-${monthPart}`);
    setYearDropdownOpen(false);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Link
          variant="button"
          buttonVariant="bare"
          onPress={() => onSelect(currentMonth)}
          style={{
            padding: '4px 6px',
            borderRadius: 6,
          }}
        >
          <View title={t('Today')}>
            <SvgCalendar
              style={{
                width: 14,
                height: 14,
              }}
            />
          </View>
        </Link>

        <Link
          variant="button"
          buttonVariant="bare"
          onPress={() => onSelect(monthUtils.prevMonth(startMonth))}
          style={{
            padding: '4px 6px',
            borderRadius: 6,
          }}
        >
          <View title={t('Previous month')}>
            <SvgCheveronLeft
              style={{
                width: 14,
                height: 14,
              }}
            />
          </View>
        </Link>

        {/* Year Dropdown Button */}
        <Button
          ref={yearTriggerRef}
          variant="bare"
          onPress={() => setYearDropdownOpen(true)}
          style={{
            padding: '4px 8px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            backgroundColor: theme.buttonBareBackgroundHover,
            color: theme.pageText,
            flexDirection: 'row',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{currentYear}</span>
          <SvgCheveronDown style={{ width: 10, height: 10, opacity: 0.6 }} />
        </Button>

        <Popover
          triggerRef={yearTriggerRef}
          isOpen={yearDropdownOpen}
          onOpenChange={setYearDropdownOpen}
          style={{ width: 100, borderRadius: 10, border: '1px solid ' + theme.menuBorder, backgroundColor: theme.menuBackground }}
        >
          <View style={{ padding: 4, gap: '2px' }}>
            {years.map(y => (
              <Button
                key={y}
                variant={y === currentYear ? 'primary' : 'bare'}
                onPress={() => onYearSelect(y)}
                style={{
                  padding: '6px 8px',
                  fontSize: 12,
                  fontWeight: y === currentYear ? 600 : 400,
                  borderRadius: 6,
                  justifyContent: 'center',
                }}
              >
                {y}
              </Button>
            ))}
          </View>
        </Popover>

        {/* Connected Segmented Month Control */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.buttonBareBackgroundHover,
            padding: '2px',
            borderRadius: 8,
            gap: '1px',
          }}
        >
          {(() => {
            const lastHoverId = hoverId === null ? null : hoverId + numDisplayed - 1;
            const monthStates = monthsToRender.map((m, i) => {
              const isSelected = m >= firstSelectedMonth && m <= lastSelectedMonth;
              const isHovered = hoverId === null ? false : i >= hoverId && i <= lastHoverId;

              if (isSelected) return 'selected';
              if (isHovered) return 'hovered';
              return 'normal';
            });

            return monthsToRender.map((month, idx) => {
              const shortMonthName = monthUtils.format(month, 'MMM', locale);

              const state = monthStates[idx];
              const stateBefore = idx > 0 ? monthStates[idx - 1] : 'normal';
              const stateAfter = idx < monthsToRender.length - 1 ? monthStates[idx + 1] : 'normal';

              const mergeLeft = state === stateBefore && state !== 'normal';
              const mergeRight = state === stateAfter && state !== 'normal';

              const roundLeft = !mergeLeft;
              const roundRight = !mergeRight;
              const noGapAfter = mergeRight;

              const selected = state === 'selected';
              const hovered = state === 'hovered';
              const current = currentMonth === month;
              const isMonthBudgeted =
                month >= monthBounds.start && month <= monthBounds.end;

              return (
                <View
                  key={month}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: 4,
                    paddingBottom: 4,
                    width: size === 'big' ? '46px' : '40px',
                    flexShrink: 0, // prevent text overlapping and squishing in flex layout
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    userSelect: 'none',
                    cursor: 'pointer',
                    borderTopLeftRadius: roundLeft ? 6 : 0,
                    borderBottomLeftRadius: roundLeft ? 6 : 0,
                    borderTopRightRadius: roundRight ? 6 : 0,
                    borderBottomRightRadius: roundRight ? 6 : 0,
                    border: 'none',
                    marginRight: noGapAfter ? '0px' : '1px',
                    ...(!isMonthBudgeted && {
                      textDecoration: 'line-through',
                      color: theme.pageTextSubdued,
                    }),
                    ...styles.smallText,
                    ...(selected && {
                      backgroundColor: theme.buttonPrimaryBackground,
                      color: theme.buttonPrimaryText,
                    }),
                    ...(hoverId !== null &&
                      !hovered &&
                      selected && {
                        filter: 'brightness(65%)',
                      }),
                    ...(hovered &&
                      !selected && {
                        backgroundColor: theme.buttonBareBackgroundHover,
                      }),
                    ...(!hovered &&
                      !selected &&
                      current && {
                        backgroundColor: theme.buttonBareBackgroundHover,
                        filter: 'brightness(120%)',
                      }),
                    ...(hovered &&
                      selected &&
                      current && {
                        filter: 'brightness(120%)',
                      }),
                    ...(hovered &&
                      selected && {
                        backgroundColor: theme.buttonPrimaryBackground,
                      }),
                    ...(current && { fontWeight: 'bold' }),
                  }}
                  onClick={() => onSelect(month)}
                  onMouseEnter={() => setHoverId(idx)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <span>{shortMonthName}</span>
                </View>
              );
            });
          })()}
        </View>

        <Link
          variant="button"
          buttonVariant="bare"
          onPress={() => onSelect(monthUtils.nextMonth(startMonth))}
          style={{
            padding: '4px 6px',
            borderRadius: 6,
          }}
        >
          <View title={t('Next month')}>
            <SvgCheveronRight
              style={{
                width: 14,
                height: 14,
              }}
            />
          </View>
        </Link>
      </View>
    </View>
  );
};
