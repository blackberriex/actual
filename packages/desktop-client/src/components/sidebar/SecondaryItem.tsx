// @ts-strict-ignore
import React from 'react';
import type {
  ComponentProps,
  ComponentType,
  CSSProperties,
  SVGProps,
} from 'react';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { accountNameStyle } from './Account';
import { ItemContent } from './ItemContent';

const fontWeight = 600;

type SecondaryItemProps = {
  title: string;
  to?: string;
  Icon?:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  style?: CSSProperties;
  onClick?: ComponentProps<typeof ItemContent>['onClick'];
  bold?: boolean;
  indent?: number;
};

export function SecondaryItem({
  Icon,
  title,
  style,
  to,
  onClick,
  bold,
  indent = 0,
}: SecondaryItemProps) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 16,
      }}
    >
      {Icon && (
        <View
          style={{
            width: 14,
            height: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon width={12} height={12} />
        </View>
      )}
      <Block style={{ marginLeft: Icon ? 8 : 0, color: 'inherit' }}>
        {title}
      </Block>
    </View>
  );

  return (
    <View style={{ flexShrink: 0, ...style }}>
      <ItemContent
        style={{
          ...accountNameStyle,
          color: theme.sidebarItemText,
          paddingLeft: 12 + indent,
          paddingRight: 8,
          margin: '2px 8px',
          borderRadius: 6,
          fontWeight: bold ? fontWeight : null,
          ':hover': {
            backgroundColor: theme.sidebarItemBackgroundHover,
            color: theme.sidebarItemTextHighlight,
          },
        }}
        to={to}
        onClick={onClick}
        activeStyle={{
          backgroundColor: theme.sidebarItemAccentSelected,
          color: theme.sidebarItemTextSelected,
          fontWeight: bold ? fontWeight : null,
          ':hover': {
            backgroundColor: theme.sidebarItemAccentSelected,
            color: theme.sidebarItemTextSelected,
          },
        }}
      >
        {content}
      </ItemContent>
    </View>
  );
}
