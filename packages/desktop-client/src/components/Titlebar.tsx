import React, { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';
import { Route, Routes, useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgArrowLeft } from '@actual-app/components/icons/v1';
import {
  SvgAlertTriangle,
  SvgNavigationMenu,
  SvgViewHide,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { SpaceBetween } from '@actual-app/components/space-between';
import type { CSSProperties } from '@actual-app/components/styles';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';
import { isDevelopmentEnvironment } from '@actual-app/core/shared/environment';
import * as Platform from '@actual-app/core/shared/platform';
import { css } from '@emotion/css';

import { sync } from '#app/appSlice';
import { SharedArrayBufferWarning } from '#components/SharedArrayBufferWarning';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useDispatch } from '#redux';
import * as bindings from '#spreadsheet/bindings';

import { AccountSyncCheck } from './accounts/AccountSyncCheck';
import { AnimatedRefresh } from './AnimatedRefresh';
import { MonthCountSelector } from './budget/MonthCountSelector';
import { Link } from './common/Link';
import { HelpMenu } from './HelpMenu';
import { LoggedInUser } from './LoggedInUser';
import { useServerURL } from './ServerContext';
import { useSidebar } from './sidebar/SidebarProvider';
import { ThemeSelector } from './ThemeSelector';

function UncategorizedButton() {
  const count: number | null = useSheetValue(bindings.uncategorizedCount());
  if (count === null || count <= 0) {
    return null;
  }

  return (
    <Link
      variant="button"
      buttonVariant="bare"
      to="/categories/uncategorized"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(232, 154, 37, 0.08)',
        border: '1px solid rgba(232, 154, 37, 0.18)',
        borderRadius: 999,
        padding: '3px 10px',
        color: '#e89a25',
        fontSize: 12,
        fontWeight: 600,
        transition: 'all 150ms ease',
        cursor: 'pointer',
        ':hover': {
          backgroundColor: 'rgba(232, 154, 37, 0.14)',
          borderColor: 'rgba(232, 154, 37, 0.3)',
          transform: 'translateY(-0.5px)',
        },
        ':active': {
          transform: 'scale(0.97)',
        },
      }}
    >
      <SvgAlertTriangle width={12} height={12} style={{ color: '#e89a25' }} />
      <Text style={{ fontSize: 12, fontWeight: 600, color: 'inherit' }}>
        <Trans count={count}>{{ count }} uncategorized transactions</Trans>
      </Text>
    </Link>
  );
}

type PrivacyButtonProps = {
  style?: CSSProperties;
};

function PrivacyButton({ style }: PrivacyButtonProps) {
  const { t } = useTranslation();
  const [isPrivacyEnabledPref, setPrivacyEnabledPref] =
    useSyncedPref('isPrivacyEnabled');
  const isPrivacyEnabled = String(isPrivacyEnabledPref) === 'true';

  const privacyIconStyle = { width: 15, height: 15 };

  useHotkeys(
    'shift+ctrl+p, shift+cmd+p, shift+meta+p',
    () => {
      setPrivacyEnabledPref(String(!isPrivacyEnabled));
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [setPrivacyEnabledPref, isPrivacyEnabled],
  );

  return (
    <Button
      variant="bare"
      aria-label={
        isPrivacyEnabled ? t('Disable privacy mode') : t('Enable privacy mode')
      }
      onPress={() => setPrivacyEnabledPref(String(!isPrivacyEnabled))}
      style={style}
    >
      {isPrivacyEnabled ? (
        <SvgViewHide style={privacyIconStyle} />
      ) : (
        <SvgViewShow style={privacyIconStyle} />
      )}
    </Button>
  );
}

type ServerSyncButtonProps = {
  style?: CSSProperties;
  isMobile?: boolean;
};
function ServerSyncButton({ style, isMobile = false }: ServerSyncButtonProps) {
  const { t } = useTranslation();
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const dispatch = useDispatch();
  const [syncing, setSyncing] = useState(false);
  const [syncState, setSyncState] = useState<
    null | 'offline' | 'local' | 'disabled' | 'error'
  >(null);

  useEffect(() => {
    const unlisten = listen('sync-event', event => {
      if (event.type === 'start') {
        setSyncing(true);
        setSyncState(null);
      } else {
        // Give the layout some time to apply the starting animation
        // so we always finish it correctly even if it's almost
        // instant
        setTimeout(() => {
          setSyncing(false);
        }, 200);
      }

      if (event.type === 'error') {
        // Use the offline state if either there is a network error or
        // if this file isn't a "cloud file". You can't sync a local
        // file.
        if (event.subtype === 'network') {
          setSyncState('offline');
        } else if (!cloudFileId) {
          setSyncState('local');
        } else {
          setSyncState('error');
        }
      } else if (event.type === 'success') {
        setSyncState(event.syncDisabled ? 'disabled' : null);
      }
    });

    return unlisten;
  }, [cloudFileId]);

  const mobileColor =
    syncState === 'error'
      ? theme.errorText
      : syncState === 'disabled' ||
          syncState === 'offline' ||
          syncState === 'local'
        ? theme.mobileHeaderTextSubdued
        : theme.mobileHeaderText;
  const desktopColor =
    syncState === 'error'
      ? theme.errorTextDark
      : syncState === 'disabled' ||
          syncState === 'offline' ||
          syncState === 'local'
        ? theme.buttonBareDisabledText
        : theme.buttonBareText;

  const activeStyle = isMobile
    ? {
        color: mobileColor,
      }
    : {};

  const hoveredStyle = isMobile
    ? {
        color: mobileColor,
        background: theme.mobileHeaderTextHover,
      }
    : {};

  const mobileIconStyle = {
    color: mobileColor,
    justifyContent: 'center',
    margin: 10,
    paddingLeft: 5,
    paddingRight: 3,
  };

  const mobileTextStyle = {
    ...styles.text,
    fontWeight: 500,
    marginLeft: 2,
    marginRight: 5,
  };

  const onSync = () => dispatch(sync());

  useHotkeys(
    'ctrl+s, cmd+s, meta+s',
    onSync,
    {
      enableOnFormTags: true,
      preventDefault: true,
      scopes: ['app'],
    },
    [onSync],
  );

  return (
    <Button
      variant="bare"
      aria-label={t('Server Sync')}
      className={css({
        ...(isMobile
          ? {
              ...style,
              WebkitAppRegion: 'none',
              ...mobileIconStyle,
            }
          : {
              ...style,
              WebkitAppRegion: 'none',
              color: desktopColor,
            }),
        '&[data-hovered]': hoveredStyle,
        '&[data-pressed]': activeStyle,
      })}
      onPress={onSync}
      isDisabled={syncState === 'offline'}
      aria-disabled={syncState === 'offline'}
    >
      {isMobile ? (
        syncState === 'error' ? (
          <SvgAlertTriangle width={14} height={14} />
        ) : (
          <AnimatedRefresh width={18} height={18} animating={syncing} />
        )
      ) : syncState === 'error' ? (
        <SvgAlertTriangle width={13} />
      ) : (
        <AnimatedRefresh animating={syncing} />
      )}
      <Text style={isMobile ? { ...mobileTextStyle } : null}>
        {syncState === 'disabled' ? ` ${t('Disabled')}` : null}
      </Text>
    </Button>
  );
}

function BudgetTitlebar() {
  const [maxMonths, setMaxMonthsPref] = useGlobalPref('maxMonths');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MonthCountSelector
        maxMonths={maxMonths || 1}
        onChange={value => setMaxMonthsPref(value)}
      />
    </View>
  );
}

type TitlebarProps = {
  style?: CSSProperties;
};

export function Titlebar({ style }: TitlebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useSidebar();
  const { isNarrowWidth } = useResponsive();
  const serverURL = useServerURL();
  const isTestEnv = useIsTestEnv();

  return isNarrowWidth ? null : (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 10px 0 15px',
        height: 36,
        pointerEvents: 'none',
        '& *': {
          pointerEvents: 'auto',
        },
        ...(!Platform.isBrowser && Platform.OS === 'mac' && sidebar.floating
          ? { paddingLeft: 80 }
          : {}),
        ...style,
      }}
    >
      {sidebar.alwaysFloats && (
        <Button
          aria-label={t('Sidebar menu')}
          variant="bare"
          style={{ marginRight: 8 }}
          onHoverStart={e => {
            if (e.pointerType === 'mouse') {
              sidebar.setHidden(false);
            }
          }}
          onPress={e => {
            if (e.pointerType !== 'mouse') {
              sidebar.setHidden(!sidebar.hidden);
            }
          }}
        >
          <SvgNavigationMenu
            className="menu"
            style={{ width: 15, height: 15, left: 0 }}
          />
        </Button>
      )}

      <Routes>
        <Route
          path="*"
          element={
            location.state?.goBack ? (
              <Button variant="bare" onPress={() => navigate(-1)}>
                <SvgArrowLeft
                  width={10}
                  height={10}
                  style={{ marginRight: 5 }}
                />{' '}
                <Trans>Back</Trans>
              </Button>
            ) : null
          }
        />

        <Route path="/accounts/:id" element={<AccountSyncCheck />} />

        <Route path="/budget" element={<BudgetTitlebar />} />
      </Routes>
      <View style={{ flex: 1 }} />
      <SpaceBetween gap={10}>
        <UncategorizedButton />
        {isDevelopmentEnvironment() && !isTestEnv && <ThemeSelector />}
        <PrivacyButton />
        {serverURL ? <ServerSyncButton /> : null}
        <SharedArrayBufferWarning />
        <LoggedInUser />
        <HelpMenu />
      </SpaceBetween>
    </View>
  );
}
