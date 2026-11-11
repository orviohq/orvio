import type { Language } from './i18n';
export const PATCH_V0326={version:'0.3.26',date:'2026-11-11',notes:{
ko:['음원을 내려받는 중 실제 데이터가 계속 도착하면 90초 경과만으로 중단하지 않습니다. 준비와 분석에는 유한한 제한 시간을 유지합니다.','실패한 곡은 다시 시도를 누르면 같은 목록에서 바로 재시도하며, 실패 안내를 단계별로 표시합니다.'],
en:['An active audio download no longer stops just because 90 seconds have passed. Preparation and analysis remain bounded.','Retry a failed song directly in the list and show failure guidance for its stage.'],
zh:['音频数据持续到达时，不再仅因经过90秒而中断下载。准备和分析仍有有限时限。','在列表中直接重试失败的歌曲，并按阶段显示失败说明。'],
ja:['音声データが届き続けている場合、90秒の経過だけでダウンロードを中断しません。準備と解析の制限時間は維持します。','失敗した曲をリストから直接再試行でき、段階に応じた案内を表示します。'],
es:['La descarga activa de audio ya no se detiene solo por superar 90 segundos. La preparación y el análisis siguen teniendo límites.','Reintenta una canción fallida desde la lista y consulta el aviso de su etapa.'],
fr:['Un téléchargement audio actif ne s’arrête plus au seul motif que 90 secondes se sont écoulées. La préparation et l’analyse restent limitées.','Relancez un morceau en échec depuis la liste avec des indications adaptées à son étape.'],
de:['Ein laufender Audiodownload endet nicht mehr allein nach 90 Sekunden. Vorbereitung und Analyse bleiben zeitlich begrenzt.','Fehlgeschlagene Titel lassen sich direkt in der Liste mit passenden Hinweisen erneut versuchen.'],
pt:['Uma transferência de áudio ativa já não para apenas por ultrapassar 90 segundos. A preparação e a análise continuam limitadas.','Tente novamente uma música com falha na lista e veja a orientação da etapa.'],
it:['Un download audio attivo non si interrompe più solo perché sono trascorsi 90 secondi. Preparazione e analisi restano limitate.','Riprova un brano non riuscito direttamente dalla lista con indicazioni relative alla fase.'],
ru:['Активная загрузка аудио больше не останавливается только из-за истечения 90 секунд. Подготовка и анализ по-прежнему ограничены по времени.','Повторите загрузку неудачного трека прямо в списке с пояснением для текущего этапа.'],
id:['Unduhan audio aktif tidak lagi berhenti hanya karena 90 detik telah berlalu. Persiapan dan analisis tetap dibatasi.','Coba lagi lagu yang gagal langsung dari daftar dengan petunjuk sesuai tahapnya.'],
tr:['Etkin ses indirmesi yalnızca 90 saniye geçtiği için durmaz. Hazırlık ve analiz süreleri sınırlı kalır.','Başarısız şarkıyı listeden doğrudan yeniden deneyin ve aşamasına uygun açıklamayı görün.'],
vi:['Tải âm thanh đang tiến triển không còn dừng chỉ vì đã qua 90 giây. Chuẩn bị và phân tích vẫn có thời hạn.','Thử lại bài hát bị lỗi ngay trong danh sách với hướng dẫn theo từng giai đoạn.']
} satisfies Record<Language,string[]>};
