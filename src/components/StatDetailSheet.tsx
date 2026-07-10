import { ReactNode } from "react";
import { Modal } from "./Modal";

export type DetailRow = {
  key: string;
  label: string;
  meta?: string;
  value: ReactNode;
  // Omit when the row has no data to plot — it renders dimmed, same as an
  // unplayed surface in the overview panel.
  bar?: { leftPct: number; rightPct: number; leftColor: string; rightColor: string };
};

type StatDetailSheetProps = {
  titleId: string;
  eyebrow?: string;
  title: ReactNode;
  rows: DetailRow[];
  children?: ReactNode;
  note?: string;
  onClose: () => void;
};

export function StatDetailSheet({ titleId, eyebrow, title, rows, children, note, onClose }: StatDetailSheetProps) {
  return (
    <Modal titleId={titleId} eyebrow={eyebrow} title={title} onClose={onClose}>
      {children}
      <div className="surface-list detail-sheet-list">
        {rows.map((row) => (
          <div className={`surface-row ${row.bar ? "" : "surface-row-empty"}`} key={row.key}>
            <span>
              {row.label}
              {row.meta ? <em className="surface-count"> · {row.meta}</em> : null}
            </span>
            <div className="surface-track surface-h2h">
              {row.bar ? (
                <>
                  <span className="h2h-fill" style={{ width: `${row.bar.leftPct}%`, background: row.bar.leftColor }} />
                  <span className="h2h-fill" style={{ width: `${row.bar.rightPct}%`, background: row.bar.rightColor }} />
                </>
              ) : null}
            </div>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
      {note ? <p className="evidence-note">{note}</p> : null}
    </Modal>
  );
}
