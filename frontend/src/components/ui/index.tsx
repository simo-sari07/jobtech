/**
 * Reusable UI primitives — Button, Input, Badge, Spinner, Card
 * All styled with inline styles anchored to CSS design tokens.
 */
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import { Loader2 } from "lucide-react";

/* ── Button ─────────────────────────────────────────────── */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type BtnSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const BTN_BASE = `
  inline-flex items-center justify-center gap-2 font-medium rounded-lg border
  transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed
`;
const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary:
    "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm",
  secondary:
    "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
  ghost:
    "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm",
  dark: "bg-slate-950 text-white border-slate-950 hover:bg-slate-900 shadow-sm",
};
const BTN_SIZES: Record<BtnSize, string> = {
  sm: "px-3 py-1.5 text-xs h-8",
  md: "px-4 py-2 text-sm h-9",
  lg: "px-5 py-2.5 text-sm h-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      fullWidth,
      icon,
      children,
      className = "",
      disabled,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ── Input ──────────────────────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className = "", id, ...rest }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900
            placeholder-slate-400 outline-none transition-all
            focus:border-blue-500 focus:ring-3 focus:ring-blue-50
            ${error ? "border-red-400 focus:border-red-500 focus:ring-red-50" : "border-slate-200"}
            ${leftIcon ? "pl-9" : ""}
            ${className}
          `}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  ),
);
Input.displayName = "Input";

/* ── Badge ──────────────────────────────────────────────── */
type BadgeVariant =
  | "default"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "teal";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: "sm" | "md";
  dot?: boolean;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-600 border-slate-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
};
const DOT_COLORS: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  teal: "bg-teal-500",
};

export function Badge({
  variant = "default",
  size = "sm",
  dot,
  children,
}: BadgeProps) {
  return (
    <span
      className={`
      inline-flex items-center gap-1.5 font-medium rounded-full border
      ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"}
      ${BADGE_VARIANTS[variant]}
    `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLORS[variant]}`}
        />
      )}
      {children}
    </span>
  );
}

/* ── Card ───────────────────────────────────────────────── */
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  className = "",
  hover,
  padding = "md",
}: CardProps) {
  const pads = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };
  return (
    <div
      className={`
      bg-white border border-slate-200 rounded-xl shadow-sm
      ${hover ? "hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer" : ""}
      ${pads[padding]}
      ${className}
    `}
    >
      {children}
    </div>
  );
}

/* ── Spinner ────────────────────────────────────────────── */
export function Spinner({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-blue-600 ${className}`}
    />
  );
}

/* ── Divider ────────────────────────────────────────────── */
export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-slate-200 ${className}`} />;
}

/* ── Empty state ────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div>
        <p className="font-medium text-slate-700">{title}</p>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
