import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, strokeWidth = 4, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 60 60",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    xmlns: "http://www.w3.org/2000/svg",
    ...rest,
  };
}

export function FilePlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M50 20L35 5H15C13.6739 5 12.4021 5.52678 11.4645 6.46447C10.5268 7.40215 10 8.67392 10 10V50C10 51.3261 10.5268 52.5979 11.4645 53.5355C12.4021 54.4732 13.6739 55 15 55H45C46.3261 55 47.5979 54.4732 48.5355 53.5355C49.4732 52.5979 50 51.3261 50 50V20ZM35 5V20H50M30 45V30M22.5 37.5H37.5" />
    </svg>
  );
}

export function CodesandboxIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18.75 10.5248L30 17.0248L41.25 10.5248M18.75 49.4748V36.4998L7.5 29.9998M52.5 29.9998L41.25 36.4998V49.4748M8.175 17.3998L30 30.0248L51.825 17.3998M30 55.1998V29.9998M52.5 39.9998V19.9998C52.4991 19.1229 52.2676 18.2618 51.8288 17.5027C51.3901 16.7435 50.7593 16.1132 50 15.6748L32.5 5.67476C31.7399 5.23591 30.8777 5.00488 30 5.00488C29.1223 5.00488 28.2601 5.23591 27.5 5.67476L10 15.6748C9.24066 16.1132 8.60995 16.7435 8.17115 17.5027C7.73236 18.2618 7.5009 19.1229 7.5 19.9998V39.9998C7.5009 40.8766 7.73236 41.7377 8.17115 42.4968C8.60995 43.256 9.24066 43.8863 10 44.3248L27.5 54.3248C28.2601 54.7636 29.1223 54.9946 30 54.9946C30.8777 54.9946 31.7399 54.7636 32.5 54.3248L50 44.3248C50.7593 43.8863 51.3901 43.256 51.8288 42.4968C52.2676 41.7377 52.4991 40.8766 52.5 39.9998Z" />
    </svg>
  );
}

export function ShapesIcon({ size = 24, strokeWidth = 5, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      {...rest}
    >
      <path
        d="M38.0273 31.5488H7.37109L22.6992 4.99902L38.0273 31.5488Z"
        strokeWidth={strokeWidth}
      />
      <rect x="30.7207" y="9.61182" width="26.7793" height="26.7793" strokeWidth={strokeWidth} />
      <circle cx="31.852" cy="41.8427" r="15.6596" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function WarningIcon({ size = 96, className = "text-coral", ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 246 246"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <path
        d="M107.845 31.25C114.58 19.5834 131.419 19.5834 138.155 31.25L210.035 155.75C216.771 167.417 208.351 182 194.88 182H51.1201C37.859 182 29.4932 167.869 35.6602 156.299L35.9648 155.75L107.845 31.25Z"
        stroke="currentColor"
        strokeWidth="5"
      />
      <path
        d="M116.3 124.7L113.2 79H131.8L128.7 124.7H116.3ZM122.5 149.8C119.7 149.8 117.4 148.9 115.6 147.1C113.8 145.3 112.9 143.167 112.9 140.7C112.9 138.167 113.8 136.067 115.6 134.4C117.4 132.667 119.7 131.8 122.5 131.8C125.367 131.8 127.667 132.667 129.4 134.4C131.2 136.067 132.1 138.167 132.1 140.7C132.1 143.167 131.2 145.3 129.4 147.1C127.667 148.9 125.367 149.8 122.5 149.8Z"
        fill="currentColor"
      />
    </svg>
  );
}
