// @ts-strict-ignore
import React from 'react';
import type {
  ComponentProps,
  ComponentType,
  CSSProperties,
  ReactNode,
  SVGProps,
} from 'react';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ItemContent } from './ItemContent';

type ItemProps = {
  title: string;
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  to?: string;
  children?: ReactNode;
  style?: CSSProperties;
  indent?: number;
  onClick?: ComponentProps<typeof ItemContent>['onClick'];
  forceHover?: boolean;
  forceActive?: boolean;
  iconColor?: string;
};

export function Item({
  children,
  Icon,
  title,
  style,
  to,
  onClick,
  indent = 0,
  forceHover = false,
  forceActive = false,
  iconColor,
}: ItemProps) {
  const hoverStyle = {
    backgroundColor: theme.sidebarItemBackgroundHover,
    color: theme.sidebarItemTextHighlight,
  };

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 20,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon
          width={20}
          height={20}
          style={iconColor ? { color: iconColor } : undefined}
        />
      </View>
      <Block style={{ marginLeft: 12, fontSize: 13 }}>{title}</Block>
      <View style={{ flex: 1 }} />
    </View>
  );

  return (
    <View style={{ flexShrink: 0, ...style }}>
      <ItemContent
        style={{
          display: 'block',
          ...styles.smallText,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 12 + indent,
          paddingRight: 8,
          margin: '2px 8px',
          borderRadius: 12,
          textDecoration: 'none',
          color: theme.sidebarItemText,
          transition: 'background-color 150ms ease, color 150ms ease',
          ...(forceHover ? hoverStyle : {}),
          ':hover': hoverStyle,
          '&.active': {
            backgroundColor: theme.sidebarItemBackgroundSelected,
            color: theme.sidebarItemTextSelected,
          },
        }}
        forceActive={forceActive}
        activeStyle={{
          backgroundColor: theme.sidebarItemBackgroundSelected,
          color: theme.sidebarItemTextSelected,
          ':hover': {
            backgroundColor: theme.sidebarItemBackgroundSelected,
            color: theme.sidebarItemTextSelected,
          },
        }}
        to={to}
        onClick={onClick}
      >
        {content}
      </ItemContent>
      {children ? <View style={{ marginTop: 2 }}>{children}</View> : null}
    </View>
  );
}
