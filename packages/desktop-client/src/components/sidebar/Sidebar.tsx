import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as Platform from '@actual-app/core/shared/platform';
import { css, cx } from '@emotion/css';
import { Resizable } from 're-resizable';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useLocalPref } from '#hooks/useLocalPref';
import { useResizeObserver } from '#hooks/useResizeObserver';
import { replaceModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { Accounts } from './Accounts';
import { BudgetName } from './BudgetName';
import { PrimaryButtons } from './PrimaryButtons';
import { SecondaryButtons } from './SecondaryButtons';
import { useSidebar } from './SidebarProvider';

export function Sidebar() {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const sidebar = useSidebar();
  const { width } = useResponsive();
  const isFloating = false;

  const [sidebarWidthLocalPref, setSidebarWidthLocalPref] =
    useLocalPref('sidebarWidth');
  const DEFAULT_SIDEBAR_WIDTH = 240;
  const MAX_SIDEBAR_WIDTH = width / 3;
  const MIN_SIDEBAR_WIDTH = 200;

  const [sidebarWidth, setSidebarWidth] = useState(
    Math.min(
      MAX_SIDEBAR_WIDTH,
      Math.max(
        MIN_SIDEBAR_WIDTH,
        sidebarWidthLocalPref || DEFAULT_SIDEBAR_WIDTH,
      ),
    ),
  );

  const onResizeStop = () => {
    setSidebarWidthLocalPref(sidebarWidth);
  };

  const containerRef = useResizeObserver<HTMLDivElement>(rect => {
    setSidebarWidth(rect.width);
  });

  function onAddAccount() {
    dispatch(replaceModal({ modal: { name: 'add-account', options: {} } }));
  }

  return (
    <ErrorBoundary fallback={<FeatureErrorFallback />}>
      <Resizable
        size={{
          width: sidebarWidth,
          height: '100%',
        }}
        onResizeStop={onResizeStop}
        maxWidth={MAX_SIDEBAR_WIDTH}
        minWidth={MIN_SIDEBAR_WIDTH}
        enable={{
          top: false,
          right: true,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
      >
        <View
          innerRef={containerRef}
          className={cx(
            'sidebar',
            css({
              color: theme.sidebarItemText,
              height: '100%',
              backgroundColor: theme.sidebarBackground,
              borderRight: '1px solid ' + theme.sidebarBorder,
              boxShadow: '1px 0 8px rgba(0, 0, 0, 0.04)',
              '& .float': {
                opacity: isFloating ? 1 : 0,
                transition: 'opacity .25s, width .25s',
                width: hasWindowButtons || isFloating ? null : 0,
              } as CSSProperties,
              '&:hover .float': {
                opacity: 1,
                width: hasWindowButtons ? null : 'auto',
              } as CSSProperties,
              flex: 1,
              ...styles.darkScrollbar,
            })
          )}
        >
          <BudgetName />

          <View
            style={{
              flexGrow: 1,
              '@media screen and (max-height: 480px)': {
                overflowY: 'auto',
              },
            }}
          >
            <PrimaryButtons />

            <Accounts />

            <SecondaryButtons
              buttons={[
                {
                  title: t('Add account'),
                  Icon: SvgAdd,
                  onClick: onAddAccount,
                },
              ]}
            />
          </View>
        </View>
      </Resizable>
    </ErrorBoundary>
  );
}
