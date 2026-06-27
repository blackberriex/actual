import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgAdd = (props: SVGProps<SVGSVGElement>) => (
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
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);
