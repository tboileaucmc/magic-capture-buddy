import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInvitationHistory } from "@/lib/invitation-history.functions";
import { invitationStatusLabel } from "@/lib/invitation-status";

type Status = "all" | "pending" | "sent" | "failed";
const historyOptions = (page: number, status: Status) => queryOptions({ queryKey: ["invitation-history", page, status], queryFn: () => getInvitationHistory({ data: { page, status } }) });
export const Route = createFileRoute("/_authenticated/invitations")({
  validateSearch: (search: Record<string, unknown>): { page: number; status: Status } => ({ page: Math.max(0, Math.min(10000, Number(search.page) || 0)), status: search.status === "sent" || search.status === "failed" || search.status === "pending" ? search.status : "all" }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(historyOptions(deps.page, deps.status)),
  head: () => ({ meta: [
    { title: "Invitations envoyées — Cinemeccanica" },
    { name: "description", content: "Suivi privé des envois d’invitations de mission Cinemeccanica." },
    { property: "og:title", content: "Invitations envoyées — Cinemeccanica" },
    { property: "og:description", content: "Journal des invitations de mission réservé aux super administrateurs." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: () => <div className="cmc-theme min-h-screen p-6"><h1 className="text-xl font-semibold">Suivi indisponible</h1><p className="mt-3 text-muted-foreground">Accès réservé aux super administrateurs.</p><Button asChild variant="outline" className="mt-6"><Link to="/planning"><ArrowLeft /> Planning</Link></Button></div>,
  component: InvitationsPage,
});
const dateTime = (value: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
function InvitationsPage() {
  const { page, status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, refetch, isFetching } = useSuspenseQuery(historyOptions(page, status));
  return <main className="cmc-theme min-h-screen px-4 py-6 sm:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div><Button asChild variant="ghost" className="mb-3"><Link to="/planning"><ArrowLeft /> Planning</Link></Button><h1 className="flex items-center gap-3 text-2xl font-semibold"><Mail className="text-primary" /> Invitations envoyées</h1></div>
        <Button variant="outline" size="icon" aria-label="Actualiser les invitations" title="Actualiser" disabled={isFetching} onClick={() => void refetch()}><RefreshCw /></Button>
      </header>
      <p className="my-5 text-sm text-muted-foreground">L’envoi accepté par Google ne confirme pas la réception du courriel. Ce journal couvre les nouveaux envois à partir de sa mise en service.</p>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Select value={status} onValueChange={(value: Status) => void navigate({ search: { page: 0, status: value } })}><SelectTrigger className="w-64" aria-label="Filtrer les invitations"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="sent">Envoi accepté par Google</SelectItem><SelectItem value="failed">Échec de l’envoi</SelectItem><SelectItem value="pending">Résultat non confirmé</SelectItem></SelectContent></Select>
        <span className="text-sm text-muted-foreground">{data.count} invitation{data.count > 1 ? "s" : ""}</span>
      </div>
      <div className="overflow-x-auto border-y">
        <table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted"><tr>{["Date et heure · Paris", "Mission", "Destinataires", "Statut"].map(label => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>
          {data.rows.map(row => <tr key={row.id} className="border-t align-top"><td className="whitespace-nowrap p-3">{dateTime(row.created_at)}{row.completed_at && <div className="mt-1 text-xs text-muted-foreground">Terminé : {dateTime(row.completed_at)}</div>}</td><td className="max-w-80 break-words p-3 font-medium">{row.mission_title}<div className="mt-1 text-xs font-normal text-muted-foreground">{row.mission_start.replace("T", " · ")} → {row.mission_end.replace("T", " · ")}</div></td><td className="max-w-80 break-words p-3">{Array.isArray(row.recipients) && row.recipients.length ? row.recipients.map((guest, index) => { const recipient = guest as { email?: string; displayName?: string }; return <div key={index}>{recipient.displayName && <span>{recipient.displayName} · </span>}{recipient.email}</div>; }) : "Aucun invité"}</td><td className="max-w-72 p-3"><span className={row.status === "failed" ? "text-destructive" : row.status === "sent" ? "text-primary" : "text-muted-foreground"}>{invitationStatusLabel(row.status)}</span>{row.error_message && <p className="mt-2 text-xs text-muted-foreground">{row.error_message}</p>}</td></tr>)}
          {!data.rows.length && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Aucune invitation enregistrée{status !== "all" ? " pour ce statut" : ""}.</td></tr>}
        </tbody></table>
      </div>
      <footer className="mt-5 flex items-center justify-end gap-3"><Button variant="outline" size="icon" aria-label="Page précédente" disabled={page === 0} onClick={() => void navigate({ search: { page: page - 1, status } })}><ChevronLeft /></Button><span className="text-sm">Page {page + 1}</span><Button variant="outline" size="icon" aria-label="Page suivante" disabled={(page + 1) * 50 >= data.count} onClick={() => void navigate({ search: { page: page + 1, status } })}><ChevronRight /></Button></footer>
    </div>
  </main>;
}