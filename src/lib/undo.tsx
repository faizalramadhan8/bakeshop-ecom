// undoToast — pattern "delete dengan grace period 5 detik" per rule §8
// undo-support (Sprint 4 foundation, 30 Jul 2026).
//
// Alih-alih confirm dialog blocking, aksi destructive dieksekusi optimistik
// dengan toast "Batalkan?". Kalau user klik Batalkan sebelum 5 detik,
// aksi di-rollback (BE tidak pernah dipanggil). Kalau tidak, commit ke BE.
//
// Contoh pakai:
//   undoToast({
//     message: `Kategori "${c.name}" dihapus`,
//     onCommit: () => adminApi.deleteCategory(c.id),
//     onOptimistic: () => setItems(prev => prev.filter(x => x.id !== c.id)),
//     onRollback: () => load(),
//   });

import toast from "react-hot-toast";

interface UndoOptions {
  message: string;                            // Toast text — sertakan konteks
  duration?: number;                          // Default 5000ms
  onOptimistic?: () => void;                  // Update UI langsung
  onCommit: () => Promise<unknown>;           // Panggil BE setelah timer habis
  onRollback?: () => void;                    // Kembalikan UI kalau user cancel
  onError?: (err: unknown) => void;           // Kalau commit gagal
}

export function undoToast({
  message,
  duration = 5000,
  onOptimistic,
  onCommit,
  onRollback,
  onError,
}: UndoOptions) {
  let cancelled = false;

  // Update UI langsung supaya user rasa cepat.
  onOptimistic?.();

  const toastId = toast(
    (t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">{message}</span>
        <button
          type="button"
          onClick={() => {
            cancelled = true;
            onRollback?.();
            toast.dismiss(t.id);
            toast.success("Aksi dibatalkan", { duration: 2000 });
          }}
          className="text-xs font-black text-cherry-300 hover:text-cherry-100 underline underline-offset-2"
        >
          Batalkan
        </button>
      </div>
    ),
    { duration, id: `undo-${Date.now()}` }
  );

  // Timer commit — setelah duration, panggil BE.
  window.setTimeout(async () => {
    if (cancelled) return;
    try {
      await onCommit();
      // Silent success — toast asli sudah hilang, jangan spam toast baru.
    } catch (err) {
      onRollback?.();
      onError?.(err);
      toast.error(err instanceof Error ? err.message : "Aksi gagal disimpan");
      toast.dismiss(toastId);
    }
  }, duration);
}
