// 確認ダイアログ（メッセージ＋実行/キャンセル）の共通表示。保存・削除・再投稿の確認で使う
export default function ConfirmBox({
  message,
  confirmLabel,
  busyLabel,
  busy,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  confirmClass: 'btn-main' | 'btn-danger' | 'btn-sub';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <p className="confirm-msg">{message}</p>
      <div className="action-row">
        <button className={confirmClass} onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
        <button className="btn-sub" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
