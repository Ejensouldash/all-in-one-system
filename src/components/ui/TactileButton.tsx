"use client"

import React, { forwardRef } from "react"
import { Loader2 } from "lucide-react"

export type TactileButtonVariant =
  | "primary"
  | "emerald"
  | "amber"
  | "secondary"
  | "danger"
  | "ghost"
  | "dark"

export type TactileButtonSize = "sm" | "md" | "lg" | "xl"

export interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TactileButtonVariant
  size?: TactileButtonSize
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<TactileButtonVariant, string> = {
  primary:
    "bg-cyan-700 text-white hover:bg-cyan-800 focus-visible:ring-cyan-500 shadow-md shadow-cyan-900/10 border border-cyan-800/30",
  emerald:
    "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-500 shadow-md shadow-emerald-900/10 border border-emerald-800/30",
  amber:
    "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500 shadow-md shadow-amber-900/10 border border-amber-700/30",
  secondary:
    "bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-400 border border-slate-300 shadow-sm",
  danger:
    "bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 focus-visible:ring-red-500 border border-red-200 shadow-sm",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 border border-transparent shadow-none",
  dark:
    "bg-slate-900 text-white hover:bg-slate-950 focus-visible:ring-slate-700 shadow-md shadow-slate-950/20 border border-slate-800",
}

const sizeStyles: Record<TactileButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5 font-bold min-h-[36px]",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2 font-bold min-h-[44px]",
  lg: "px-5 py-3.5 text-sm md:text-base rounded-xl gap-2.5 font-black min-h-[50px]",
  xl: "px-6 py-4 text-base md:text-lg rounded-2xl gap-3 font-black min-h-[56px]",
}

export const TactileButton = forwardRef<HTMLButtonElement, TactileButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      icon,
      fullWidth = false,
      disabled,
      className = "",
      type = "button",
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        aria-busy={loading}
        className={`
          relative inline-flex items-center justify-center select-none
          transition-all duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${
            isDisabled
              ? "opacity-50 cursor-not-allowed pointer-events-none shadow-none"
              : "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-inner cursor-pointer"
          }
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </button>
    )
  }
)

TactileButton.displayName = "TactileButton"
