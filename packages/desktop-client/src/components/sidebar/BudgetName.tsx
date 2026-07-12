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
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            marginRight: 10,
            flexShrink: 0,
          }}
        >
          {/* Outer combination dial ring */}
          <circle cx="12" cy="12" r="9.5" />
          
          {/* Inner circular groove */}
          <circle cx="12" cy="12" r="6" strokeDasharray="2 2" strokeWidth="1" opacity="0.7" />
          
          {/* Outer alignment ticks (Twelve, Three, Six, Nine o'clock) */}
          <line x1="12" y1="2.5" x2="12" y2="4.5" />
          <line x1="12" y1="19.5" x2="12" y2="21.5" />
          <line x1="2.5" y1="12" x2="4.5" y2="12" />
          <line x1="19.5" y1="12" x2="21.5" y2="12" />
          
          {/* 45-degree sub-ticks */}
          <line x1="17" y1="7" x2="18.4" y2="5.6" opacity="0.6" strokeWidth="1" />
          <line x1="17" y1="17" x2="18.4" y2="18.4" opacity="0.6" strokeWidth="1" />
          <line x1="7" y1="17" x2="5.6" y2="18.4" opacity="0.6" strokeWidth="1" />
          <line x1="7" y1="7" x2="5.6" y2="5.6" opacity="0.6" strokeWidth="1" />
          
          {/* Center lock spindle / knob */}
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          
          {/* Pointer indicator pointing to 2 o'clock */}
          <line x1="12" y1="12" x2="16.5" y2="7.5" strokeWidth="2" />
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
