import { ReactNode } from "react";
import { Modal } from "./Modal";

export type DetailRow = {
  key: string;
  label: string;
  meta?: string;
  value: ReactNode;
  bar?: { leftPct: number; rightPct: number; leftColor: string; rightColor: string };
  isEmpty?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
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
        {rows.map((row) => {
          const content = (
            <>
            <span>
              {row.label}
              {row.meta ? <em className="surface-count"> · {row.meta}</em> : null}
            </span>
            <span className="surface-track surface-h2h">
              {row.bar ? (
                <>
                  <span className="h2h-fill" style={{ width: `${row.bar.leftPct}%`, background: row.bar.leftColor }} />
                  <span className="h2h-fill" style={{ width: `${row.bar.rightPct}%`, background: row.bar.rightColor }} />
                </>
              ) : null}
            </span>
            <strong>{row.value}</strong>
            </>
          );
          const className = `surface-row ${row.isEmpty ? "surface-row-empty" : ""} ${row.onClick ? "surface-row-action" : ""}`;
          return row.onClick ? (
            <button type="button" className={className} key={row.key} onClick={row.onClick} aria-label={row.ariaLabel}>{content}</button>
          ) : (
            <div className={className} key={row.key}>{content}</div>
          );
        })}
      </div>
      {note ? <p className="evidence-note">{note}</p> : null}
    </Modal>
  );
}
