import type { Language } from "./i18n";
export const PATCH_V0319 = {
  version: "0.3.19",
  date: "2026-11-11",
  notes: {
    ko: [
      "클라이언트 전용 모드의 결과 공유를 수정해 복사한 링크에 결과와 리플레이가 유지되도록 했습니다.",
    ],
    en: [
      "Fixed result sharing in client-only mode so the copied link retains the result and replay.",
    ],
    zh: ["修复了纯客户端模式下的结果分享，复制的链接会保留结果和回放。"],
    ja: [
      "クライアント専用モードの結果共有を修正し、コピーしたリンクに結果とリプレイが保持されるようにしました。",
    ],
    es: [
      "Se corrigió el uso compartido de resultados en el modo de solo cliente para que el enlace copiado conserve el resultado y la repetición.",
    ],
    fr: [
      "Correction du partage des résultats en mode client seul afin que le lien copié conserve le résultat et la rediffusion.",
    ],
    de: [
      "Die Ergebnisfreigabe im reinen Client-Modus wurde korrigiert, damit der kopierte Link Ergebnis und Replay behält.",
    ],
    pt: [
      "Corrigida a partilha de resultados no modo apenas cliente para que o link copiado mantenha o resultado e a repetição.",
    ],
    it: [
      "Corretta la condivisione dei risultati in modalità solo client, così il link copiato conserva il risultato e il replay.",
    ],
    ru: [
      "Исправлена отправка результатов в клиентском режиме: скопированная ссылка сохраняет результат и повтор.",
    ],
    id: [
      "Memperbaiki berbagi hasil dalam mode khusus klien agar tautan yang disalin menyimpan hasil dan replay.",
    ],
    tr: [
      "Yalnızca istemci modunda sonuç paylaşımı düzeltildi; kopyalanan bağlantı sonucu ve tekrarı korur.",
    ],
    vi: [
      "Đã sửa tính năng chia sẻ kết quả ở chế độ chỉ phía máy khách để liên kết được sao chép giữ lại kết quả và bản phát lại.",
    ],
  } satisfies Record<Language, string[]>,
};
