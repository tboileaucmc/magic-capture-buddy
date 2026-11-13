import { Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/lib/planning-types";

export function MissionAttachments({ attachments, onRemove, disabled }: {
  attachments: Attachment[];
  onRemove: (index: number) => void;
  disabled: boolean;
}) {
  if (attachments.length === 0) return null;
  return (
    <section aria-label="Pièces jointes de la mission" className="shrink-0 border-b px-3 py-2 sm:px-6">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Paperclip className="size-3.5" /> Pièces jointes ({attachments.length})
      </div>
      <ul className="max-h-28 space-y-1 overflow-y-auto text-sm">
        {attachments.map((file, index) => (
          <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
            <a href={file.dataUrl} download={file.name} className="min-w-0 break-all underline">{file.name}</a>
            <Button variant="ghost" size="icon" disabled={disabled} aria-label={`Retirer ${file.name}`} onClick={() => onRemove(index)} className="size-7 shrink-0">
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}