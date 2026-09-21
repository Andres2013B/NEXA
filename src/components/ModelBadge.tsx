import { providerLabel, type ProviderId } from "@/lib/nexa/models";

const COLORS: Record<ProviderId, string> = {
  openai: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  anthropic: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  google: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

export function ModelBadge({
  provider,
  model,
}: {
  provider: ProviderId;
  model?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[provider]}`}
      title={model}
    >
      {providerLabel(provider)}
    </span>
  );
}
