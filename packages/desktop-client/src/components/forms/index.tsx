import React from 'react';
import type { ComponentProps, ReactNode } from 'react';

import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

type SectionLabelProps = {
  title?: string;
  style?: CSSProperties;
};

export const SectionLabel = ({ title, style }: SectionLabelProps) => {
  return (
    <View
      style={{
        fontWeight: 500,
        textTransform: 'uppercase',
        color: theme.formLabelText,
        marginBottom: 5,
        lineHeight: '1em',
        ...style,
      }}
    >
      {title}
    </View>
  );
};

type FormLabelProps = {
  title: string;
  id?: string;
  htmlFor?: string;
  style?: CSSProperties;
};

const defaultLabelStyle: CSSProperties = {
  fontSize: 13,
  marginBottom: 3,
  color: theme.tableText,
};

export const FormLabel = ({ style, title, id, htmlFor }: FormLabelProps) => {
  return (
    <Text
      style={{
        ...defaultLabelStyle,
        ...style,
      }}
    >
      <label htmlFor={htmlFor} id={id}>
        {title}
      </label>
    </Text>
  );
};

export const FormTextLabel = ({
  style,
  title,
  id,
}: Omit<FormLabelProps, 'htmlFor'>) => {
  return (
    <Text
      style={{
        ...defaultLabelStyle,
        cursor: 'default',
        ...style,
      }}
    >
      <span id={id}>{title}</span>
    </Text>
  );
};

type FormFieldProps = {
  style?: CSSProperties;
  children: ReactNode;
};

export const FormField = ({ style, children }: FormFieldProps) => {
  return <View style={style}>{children}</View>;
};

// Custom inputs

type CheckboxProps = Omit<ComponentProps<'input'>, 'style'> & {
  style?: CSSProperties;
};

export const Checkbox = (props: CheckboxProps) => {
  return (
    <input
      type="checkbox"
      {...props}
      className={css([
        {
          position: 'relative',
          margin: 0,
          flexShrink: 0,
          marginRight: 6,
          width: 15,
          height: 15,
          appearance: 'none',
          outline: 0,
          border: '1px solid ' + theme.formInputBorder,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.checkboxText,
          backgroundColor: theme.tableBackground,
          ':checked': {
            border: '1px solid ' + theme.checkboxBorderSelected,
            backgroundColor: theme.checkboxBackgroundSelected,
            '::after': {
              display: 'block',
              content: '" "',
              width: 9,
              height: 9,
              backgroundColor: theme.checkboxToggleBackgroundSelected,
              WebkitMaskImage: 'url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M3 10l4 4 10-10"/></svg>\')',
              maskImage: 'url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M3 10l4 4 10-10"/></svg>\')',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
            },
          },
          ':disabled': {
            border: '1px solid ' + theme.buttonNormalDisabledBorder,
            backgroundColor: theme.buttonNormalDisabledBorder,
          },
          ':checked:disabled': {
            border: '1px solid ' + theme.buttonNormalDisabledBorder,
            backgroundColor: theme.buttonNormalDisabledBorder,
            '::after': {
              backgroundColor: theme.buttonNormalDisabledBorder,
            },
          },
          '&:focus-visible': {
            '::before': {
              position: 'absolute',
              top: -5,
              bottom: -5,
              left: -5,
              right: -5,
              border: '2px solid ' + theme.checkboxBorderSelected,
              borderRadius: 6,

              content: '" "',
            },
          },
        },
        props.style,
      ])}
    />
  );
};
