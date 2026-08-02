// AnnouncementBar — sticky bar di atas storefront, config lewat admin.
// Sprint 4 Chunk 5 (31 Jul 2026).

import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePublicSettings } from "@/lib/publicSettings";

const DISMISS_KEY = "bakeshop-announcement-dismissed";

export function AnnouncementBar() {
  const settings = usePublicSettings();
  // Dismiss per-message: kalau text berubah, bar muncul lagi. Simpan hash text.
  const [dismissedText, setDismissedText] = useState<string | null>(() =>
    sessionStorage.getItem(DISMISS_KEY)
  );

  useEffect(() => {
    // Kalau text berubah setelah dismiss lama, hapus dismiss lama.
    if (dismissedText && dismissedText !== settings.announcement_bar_text) {
      // Biarkan — cek di render.
    }
  }, [dismissedText, settings.announcement_bar_text]);

  if (!settings.announcement_bar_enabled) return null;
  const text = (settings.announcement_bar_text || "").trim();
  if (!text) return null;
  if (dismissedText === text) return null;

  const ctaLabel = (settings.announcement_bar_cta_label || "").trim();
  const ctaUrl = (settings.announcement_bar_cta_url || "").trim();

  return (
    <div className="w-full bg-gradient-to-r from-cherry-500 to-cherry-600 text-white text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto flex items-center gap-2 px-4 py-2">
        <p className="flex-1 min-w-0 truncate text-center sm:text-left font-semibold">
          {text}
          {ctaLabel && ctaUrl && (
            <>
              {" · "}
              <Link
                to={ctaUrl}
                className="underline underline-offset-2 font-black hover:text-cherry-100"
              >
                {ctaLabel} →
              </Link>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, text);
            setDismissedText(text);
          }}
          aria-label="Tutup pengumuman"
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
