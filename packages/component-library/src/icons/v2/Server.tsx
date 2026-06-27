import * as React from 'react';
import type { SVGProps } from 'react';

export const SvgServer = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <rect width="20" height="8" x="2" y="3" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="13" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="7" y2="7" />
    <line x1="6" x2="6.01" y1="17" y2="17" />
    <line x1="10" x2="10.01" y1="7" y2="7" />
    <line x1="10" x2="10.01" y1="17" y2="17" />
  </svg>
);
