import React, { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { isElectron } from '@actual-app/core/shared/environment';
import * as Platform from '@actual-app/core/shared/platform';

import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { useContextMenu } from '#hooks/useContextMenu';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type BudgetNameProps = {
  children?: ReactNode;
};

export function BudgetName({ children }: BudgetNameProps) {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  return (
    <View
      style={{
        paddingTop: 35,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        margin: '0 8px 16px 20px',
        userSelect: 'none',
        transition: 'padding .4s',
        ...(hasWindowButtons
          ? {
              paddingTop: 20,
              justifyContent: 'flex-start',
            }
          : {}),
      }}
    >
      <EditableBudgetName />

      <View style={{ flex: 1, flexDirection: 'row' }} />

      {children}
    </View>
  );
}

function EditableBudgetName() {
  const { t } = useTranslation();
  const [budgetName, setBudgetNamePref] = useMetadataPref('budgetName');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const { setMenuOpen, menuOpen, handleContextMenu, resetPosition, position } =
    useContextMenu();

  function onMenuSelect(type: string) {
    setMenuOpen(false);

    switch (type) {
      case 'rename':
        setEditing(true);
        break;
      case 'settings':
        void navigate('/settings');
        break;
      case 'loadBackup':
        if (isElectron()) {
          dispatch(
            pushModal({
              modal: { name: 'load-backup', options: {} },
            }),
          );
        }
        break;
      case 'close':
        void dispatch(closeBudget());
        break;
      default:
    }
  }

  const items = [
    { name: 'rename', text: t('Rename budget') },
    { name: 'settings', text: t('Settings') },
    isElectron() ? { name: 'loadBackup', text: t('Load Backup…') } : null,
    { name: 'close', text: t('Switch file') },
  ].filter(item => item !== null);

  if (editing) {
    return (
      <InitialFocus>
        <Input
          style={{
            maxWidth: 'calc(100% - 23px)',
            fontSize: 16,
            fontWeight: 500,
          }}
          defaultValue={budgetName}
          onEnter={newBudgetName => {
            if (newBudgetName.trim() !== '') {
              setBudgetNamePref(newBudgetName);
              setEditing(false);
            }
          }}
          onBlur={() => setEditing(false)}
        />
      </InitialFocus>
    );
  }

  return (
    <View onContextMenu={handleContextMenu}>
      <Button
        ref={triggerRef}
        variant="bare"
        style={{
          color: theme.sidebarBudgetName,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginLeft: -5,
          flex: '0 auto',
          fontFamily: 'var(--font-family-display)',
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={() => {
          resetPosition();
          setMenuOpen(true);
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="9 8 144 144"
          style={{
            marginRight: 10,
            flexShrink: 0,
          }}
        >
          <path
            fill={theme.vaultLogo}
            d="M25.5,28.58,80.8,136.22,136.5,28.58ZM72.2,71.31H63.39V62.5H72.2Zm0-13.22H63.39v-8.8H72.2ZM85.41,84.52H76.6V75.71h8.81Zm0-13.21H76.6V62.5h8.81Zm0-13.22H76.6v-8.8h8.81ZM98.55,71.31H89.74V62.5h8.81ZM89.74,58.09v-8.8h8.81v8.8Z"
          />
        </svg>
        <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {budgetName || t('Unnamed')}
        </Text>
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
        style={{ margin: 1 }}
        {...position}
      >
        <Menu onMenuSelect={onMenuSelect} items={items} />
      </Popover>
    </View>
  );
}
