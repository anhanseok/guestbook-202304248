export const inputClass =
  "w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-stone-900 placeholder:text-stone-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100";

export const primaryButton =
  "rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50";

export const secondaryButton =
  "rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50";

export const ghostButton = "rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-amber-50 hover:text-amber-700";

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 text-sm text-red-600">{children}</p>;
}
