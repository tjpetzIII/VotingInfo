"use client";
import { useIntl } from "react-intl";
import { usePlan, type VotingPlan } from "@/contexts/PlanContext";

export default function PlanPage() {
  const intl = useIntl(); const { plan, update, reset } = usePlan();
  const t = (id: string) => intl.formatMessage({ id });
  return <main className="max-w-3xl mx-auto px-4 py-10 print:max-w-none">
    <h1 className="text-3xl font-bold mb-2">{t("plan.title")}</h1><p className="text-gray-600 mb-6">{t("plan.subtitle")}</p>
    {plan.stale && <div role="alert" className="p-3 mb-4 bg-yellow-50 border border-yellow-200">{t("plan.stale")}</div>}
    <section className="bg-white rounded-xl p-5 shadow space-y-4">
      <label className="block">{t("plan.method")}<select aria-label={t("plan.method")} className="block border rounded p-2 mt-1" value={plan.method} onChange={(e) => update({ method: e.target.value as VotingPlan["method"] })}><option value="">{t("plan.choose")}</option><option value="in_person">{t("plan.inPerson")}</option><option value="early">{t("plan.early")}</option><option value="mail">{t("plan.mail")}</option></select></label>
      <label className="block">{t("plan.date")}<input aria-label={t("plan.date")} type="date" className="block border rounded p-2 mt-1" value={plan.date} onChange={(e) => update({ date: e.target.value })} /></label>
      <label className="block">{t("plan.site")}<input aria-label={t("plan.site")} className="block border rounded p-2 mt-1 w-full" value={plan.site} onChange={(e) => update({ site: e.target.value })} /></label>
      <fieldset><legend className="font-semibold">{t("plan.checklist")}</legend>{["registration", "identification", "planTime"].map((key) => <label key={key} className="block mt-2"><input type="checkbox" checked={!!plan.checklist[key]} onChange={(e) => update({ checklist: { ...plan.checklist, [key]: e.target.checked } })} /> <span className="ml-2">{t(`plan.${key}`)}</span></label>)}</fieldset>
      <div className="flex gap-3 print:hidden"><button type="button" className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => window.print()}>{t("plan.print")}</button><button type="button" className="border px-4 py-2 rounded" onClick={reset}>{t("plan.reset")}</button></div>
    </section>
  </main>;
}
