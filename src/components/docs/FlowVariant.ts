export type FlowVariantKey = "purple" | "teal" | "amber" | "slate";

export const FlowVariant: Record<FlowVariantKey, {
  card: string;
  label: string;
  code: string;
  role: string;
}> = {
  purple: {
    card: "bg-purple-900 border-purple-700",
    label: "text-purple-300",
    code: "text-purple-200",
    role: "text-purple-400",
  },
  teal: {
    card: "bg-teal-900 border-teal-700",
    label: "text-teal-300",
    code: "text-teal-200",
    role: "text-teal-400",
  },
  amber: {
    card: "bg-amber-900 border-amber-700",
    label: "text-amber-300",
    code: "text-amber-200",
    role: "text-amber-400",
  },
  slate: {
    card: "bg-gray-800 border-gray-700",
    label: "text-gray-300",
    code: "text-gray-200",
    role: "",
  },
};
