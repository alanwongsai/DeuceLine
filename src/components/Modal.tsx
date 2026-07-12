import { MutableRefObject, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./useMotion";

type ModalProps = {
  titleId: string;
  eyebrow?: string;
  title: ReactNode;
  onClose: () => void;
  // Lets a caller protect an in-progress form from accidental dismissal while
  // keeping the shared sheet behavior identical for read-only detail views.
  onRequestClose?: () => void;
  dismissRef?: MutableRefObject<(() => void) | null>;
  children: ReactNode;
};

export function Modal({ titleId, eyebrow, title, onClose, onRequestClose, dismissRef, children }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [closing, setClosing] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const closingRef = useRef(false);

  const dismiss = useCallback(() => {
    if (closing) return;
    if (reducedMotion) {
      onClose();
      return;
    }
    setClosing(true);
  }, [closing, onClose, reducedMotion]);

  const requestDismiss = useCallback(() => {
    if (closing) return;
    if (onRequestClose) onRequestClose();
    else dismiss();
  }, [closing, dismiss, onRequestClose]);
  const requestDismissRef = useRef(requestDismiss);
  requestDismissRef.current = requestDismiss;
  closingRef.current = closing;

  useEffect(() => {
    if (!dismissRef) return;
    dismissRef.current = dismiss;
    return () => {
      dismissRef.current = null;
    };
  }, [dismiss, dismissRef]);

  useEffect(() => {
    if (!closing) return;
    const fallback = window.setTimeout(onClose, 300);
    return () => window.clearTimeout(fallback);
  }, [closing, onClose]);

  useEffect(() => {
    // Capture the trigger before moving focus into the sheet so close restores
    // the user to the control that opened it, not to the removed close button.
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closingRef.current) requestDismissRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // iOS Safari ignores overflow:hidden on body for touch scrolling, so the
    // page kept scrolling under open sheets on a real device. Pinning the body
    // with position:fixed is the lock iOS respects; remember the scroll offset
    // and restore it on close so the page doesn't jump to the top.
    const scrollY = window.scrollY;
    const { style } = document.body;
    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
    };
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";

    // The bottom nav is its own backdrop-filter'd glass bar. On iOS Safari a
    // backdrop-filter element isn't darkened by the sheet's dim painted above
    // it, so the white bar bled through under the floating panel as a milky
    // slab. Hiding it while any sheet is open leaves one even dim around the
    // glass block.
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
      style.position = previous.position;
      style.top = previous.top;
      style.left = previous.left;
      style.right = previous.right;
      style.width = previous.width;
      window.scrollTo(0, scrollY);
      returnFocus?.focus();
    };
  }, []);

  return (
    <div
      className={`modal-backdrop ${closing ? "is-closing" : ""}`}
      role="presentation"
      onMouseDown={requestDismiss}
      onAnimationEnd={(event) => {
        if (closing && event.target === event.currentTarget && event.animationName === "backdrop-out") onClose();
      }}
    >
      <section
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 id={titleId} aria-live="polite">{title}</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button" onClick={requestDismiss} aria-label="Close">
            <img src="./assets/icons/x-mark.svg" alt="" aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
