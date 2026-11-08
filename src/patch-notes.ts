import { PATCH_V019 } from './patch-notes-v019';
import { PATCH_V018 } from './patch-notes-v018';
import { PATCH_V017 } from './patch-notes-v017';
import { PATCH_V015 } from './patch-notes-v015';
import { NEXT_PATCH } from './patch-notes-next';
import {
  EXTRA_PATCH_LABELS,
  EXTRA_PATCHES,
  type ExtraLanguage,
} from './locales/patches';
import type { Language } from './i18n';
const BASE_PATCH_LABELS: Record<
  Exclude<Language, ExtraLanguage>,
  { title: string; back: string; scope: string }
> = {
  en: {
    title: 'Patch notes',
    back: 'Back to game',
    scope: 'What changed in Orvio.',
  },
  ko: {
    title: '패치노트',
    back: '게임으로',
    scope: 'Orvio의 업데이트 내역입니다.',
  },
  zh: {
    title: '更新日志',
    back: '返回游戏',
    scope: 'Orvio 更新记录。',
  },
  ja: {
    title: 'パッチノート',
    back: 'ゲームに戻る',
    scope: 'Orvioの更新履歴です。',
  },
  es: {
    title: 'Notas de versión',
    back: 'Volver al juego',
    scope: 'Novedades de Orvio.',
  },
};
const BASE_PATCHES: {
  version: string;
  date: string;
  notes: Record<Exclude<Language, ExtraLanguage>, string[]>;
}[] = [
  {
    version: '0.2.14',
    date: '2026-11-07',
    notes: {
      en: [
        'Prepare the playfield during the song loading screen to reduce the first-frame pause at the start of play and replays. Music and input timing, charts, judgments and scores are unchanged.',
      ],
      ko: [
        '곡 로딩 화면에서 플레이 화면을 미리 준비해 플레이와 리플레이 시작 직후의 첫 프레임 멈칫을 줄였습니다. 음악·입력 타이밍, 채보, 판정과 점수는 그대로입니다.',
      ],
      zh: [
        '在歌曲加载画面中预先准备游戏画面，减少游玩和回放开始时首帧的停顿。音乐与输入时序、谱面、判定和分数保持不变。',
      ],
      ja: [
        '曲の読み込み中にプレイ画面を準備し、プレイとリプレイ開始直後の最初のフレームの引っかかりを軽減しました。音楽と入力のタイミング、譜面、判定、スコアは変わりません。',
      ],
      es: [
        'El campo de juego se prepara durante la carga de la canción para reducir la pausa del primer fotograma al jugar o ver una repetición. No cambian la sincronización de música y entradas, los mapas, los juicios ni la puntuación.',
      ],
    },
  },
  {
    version: '0.2.13',
    date: '2026-11-07',
    notes: {
      en: [
        'Share copies a short result link without a verification window or loading message. Shared links open directly on a result screen and have a result preview card.',
        'Removed the translucent trail behind fast notes. Note speed, charts and judgments are unchanged. Patch notes can be selected and copied, with clearer player-focused text and updated local fonts.',
      ],
      ko: [
        '공유 버튼으로 별도 인증 창이나 대기 문구 없이 짧은 결과 링크를 복사합니다. 공유 링크는 결과 화면으로 바로 열리고 결과 전용 미리보기 카드를 표시합니다.',
        '빠른 노트 뒤의 반투명 잔상을 제거했습니다. 노트 속도·채보·판정은 그대로입니다. 패치노트의 문장을 읽기 쉽게 다듬고 텍스트 선택·복사를 지원하며 글꼴의 빠진 문자를 보완했습니다.',
      ],
      zh: [
        '点击分享即可复制短结果链接，不再显示验证窗口或等待提示。分享链接直接打开结果页面，并显示专用预览卡片。',
        '移除快速音符后的半透明拖影，音符速度、谱面和判定保持不变。更新日志文字更易读，支持选择和复制，并补全本地字体字符。',
      ],
      ja: [
        '共有ボタンで認証画面や待機メッセージなしに短い結果リンクをコピーできます。共有リンクは結果画面を直接開き、結果専用のプレビューを表示します。',
        '高速ノーツの後ろの半透明な残像を削除。速度・譜面・判定は変わりません。更新履歴の文章を読みやすくし、文字の選択・コピーと不足していたフォント文字に対応しました。',
      ],
      es: [
        'Compartir copia un enlace corto sin ventana de verificación ni mensaje de espera. Los enlaces abren directamente el resultado con una tarjeta de vista previa propia.',
        'Eliminada la estela translúcida de las notas rápidas, sin cambiar velocidad, mapas ni juicios. Notas de versión más claras, con selección y copia de texto y fuentes locales actualizadas.',
      ],
    },
  },
  {
    version: '0.2.12',
    date: '2026-11-07',
    notes: {
      en: [
        'Note speed, effects and shuffle are now icon selectors. New BLINK, BLINK 2, FOG, PIXEL, PIXEL 2 and BLIND visual effects, similar to but not identical to the original game. Song wallpaper now also appears behind gameplay and on repeat visits. Score increases animate without changing the actual score or judgments.',
        'A short Escape press keeps fullscreen and returns from the result to song selection when the browser allows Keyboard Lock; without support or permission the browser may still exit fullscreen. Text selection and dragging are blocked across the game, including dialogs. Patch notes open in a new tab.',
        'Missing or damaged replays stay visibly marked as unavailable. A result and its replay are uploaded only when you press Share to create a short link.',
      ],
      ko: [
        '노트 속도·노트 효과·섞기를 아이콘 선택형으로 바꾸고 BLINK·BLINK 2·FOG·PIXEL·PIXEL 2·BLIND 시각 효과를 추가했습니다. 원작과 완전히 같은 구현은 아닙니다. 월페이퍼를 플레이 배경에도 적용하고 다시 방문해도 표시합니다. 점수 상승 표시는 실제 점수와 판정을 바꾸지 않고 움직입니다.',
        'Keyboard Lock이 허용된 브라우저에서는 짧은 ESC로 전체화면을 유지한 채 결과에서 곡 선택으로 돌아갑니다. 미지원·권한 거절 시에는 브라우저가 전체화면을 종료할 수 있습니다. 결과·설정·팝업을 포함한 텍스트 선택과 드래그를 차단하고 패치노트는 새 탭에서 엽니다.',
        '누락되거나 손상된 리플레이는 사용할 수 없다고 표시됩니다. 공유 버튼을 누를 때만 결과와 리플레이를 저장해 짧은 링크를 만듭니다.',
      ],
      zh: [
        '音符速度、效果和随机选项改为图标单选。新增BLINK、BLINK 2、FOG、PIXEL、PIXEL 2、BLIND视觉效果，与原作近似但不完全相同；歌曲壁纸在游戏中显示，再次访问也会显示。分数动画不改变实际分数和判定。',
        '允许Keyboard Lock时，短按ESC从结果返回选曲且保持全屏；不支持或拒绝权限时浏览器仍可能退出全屏。禁止对话框等所有文本选择和拖动，更新日志在新标签页打开。',
        '缺失或损坏的回放会明确标记为不可用。仅点击分享时才上传结果和回放生成短链接。',
      ],
      ja: [
        'ノーツ速度・効果・シャッフルをアイコン選択に変更。BLINK、BLINK 2、FOG、PIXEL、PIXEL 2、BLINDを追加（原作と完全に同一ではありません）。壁紙をプレイ背景にも表示し、再訪時も表示。得点アニメーションは実際の得点と判定を変更しません。',
        'Keyboard Lock許可時は短いESCで全画面を維持して結果から選曲へ移動。非対応・権限拒否では全画面が終了する場合があります。ダイアログを含む文字選択とドラッグを防止。更新履歴は新しいタブで開きます。',
        '欠落・破損したリプレイは利用不可と表示されます。共有ボタンを押したときだけ結果とリプレイを保存して短いリンクを作成。',
      ],
      es: [
        'Controles por iconos y efectos BLINK, BLINK 2, FOG, PIXEL, PIXEL 2 y BLIND parecidos, aunque no idénticos, a los del juego original. El fondo de cada canción aparece también durante el juego y en visitas repetidas. La animación de puntuación no cambia la puntuación real ni los juicios.',
        'Escape corto conserva pantalla completa si Keyboard Lock está permitido; el navegador puede salir si falta soporte o permiso. Sin selección ni arrastre de texto, incluidos los diálogos. Notas en otra pestaña.',
        'Las repeticiones dañadas o ausentes se marcan como no disponibles. Solo al pulsar Compartir se suben el resultado y la repetición para crear un enlace corto.',
      ],
    },
  },
  {
    version: '0.2.11',
    date: '2026-11-07',
    notes: {
      en: [
        'Result-only option icons, judgment colors, song wallpaper, genre, BPM and chart note count. Shared results also offer explicit preview play and stop; hold tails remain judgments, not extra notes.',
        'Lane presses and releases, audio timing, pauses and effect changes are recorded on your device. A shared link replays the same performance in the same engine, with the same judgments, score and combo. Recordings stay on your device, and old result links have no replay.',
        'The first Escape in fullscreen only leaves fullscreen. Holding or repeating Escape does not close the result; a later separate press returns to song selection.',
        'Removed the duplicate Escape hint and the automatic button outline on result entry; Tab focus stays visible. Full buttons and bottom spacing remain reachable on short screens.',
      ],
      ko: [
        '결과 전용 옵션 아이콘과 판정별 색상, 곡 전용 월페이퍼, 장르·BPM·채보 노트 수를 표시합니다. 공유 결과에서도 미리듣기를 재생·정지할 수 있습니다. 홀드는 시작 노트 1개이며 끝은 별도 판정입니다.',
        '실제 레인 누름·뗌과 오디오 시각, 일시정지·효과 변경을 기기에 기록합니다. 공유 링크에서 같은 엔진으로 같은 판정·점수·콤보 그대로 다시 재생됩니다. 기록은 기기에만 저장되며 예전 결과 링크에는 리플레이가 없습니다.',
        '전체화면의 첫 ESC는 전체화면만 종료합니다. 누른 채 반복되어도 결과창은 닫지 않으며 다음 별도 ESC에 곡 선택으로 돌아갑니다.',
        '결과 진입 시 중복 ESC 안내와 자동 버튼 테두리를 없앴으며 Tab 이동 표시는 유지합니다. 작은 화면에서도 버튼 전체와 하단 여백에 접근할 수 있습니다.',
      ],
      zh: [
        '结果显示专用选项图标、判定颜色、歌曲壁纸、风格、BPM和谱面音符数量。共享结果也可播放或停止试听；长按终点是判定而非额外音符。',
        '在设备本地记录真实按下和松开、音频时间、暂停及效果变更。共享链接用相同引擎以相同判定、分数和连击回放。记录仅保存在设备上，旧结果链接没有回放。',
        '全屏时首次Escape只退出全屏。按住或重复不会关闭结果；之后单独按一次才返回选曲。',
        '移除结果页重复的ESC提示及进入时自动按钮焦点框，保留Tab焦点。短屏可查看完整按钮和底部间距。',
      ],
      ja: [
        '結果専用の設定アイコン、判定色、曲の壁紙、ジャンル、BPMと譜面ノーツ数を表示。共有結果でも試聴・停止でき、ホールド終点は追加ノーツでなく判定です。',
        '実際の押下・離上と音声時刻、停止や効果変更を端末に記録。共有リンクでは同じエンジンで同じ判定・得点・コンボのまま再生。記録は端末にのみ保存され、旧リンクにリプレイはありません。',
        '全画面中の最初のEscapeは全画面だけを終了。押し続けや連打で結果を閉じず、次の独立した押下で選曲に戻ります。',
        '結果画面の重複ESC案内と自動ボタン枠を削除し、Tabのフォーカスは維持。短い画面でもボタン全体と下余白にアクセスできます。',
      ],
      es: [
        'Iconos de opciones, colores de juicios, fondo de canción, género, BPM y número de notas en el resultado. Escucha y parada también en resultados compartidos; el final de una nota larga es un juicio adicional, no otra nota.',
        'Las pulsaciones reales, tiempos de audio, pausas y efectos se graban en tu dispositivo. Un enlace compartido reproduce la misma partida en el mismo motor, con los mismos juicios, puntuación y combo. Las grabaciones se quedan en tu dispositivo y los enlaces antiguos no tienen repetición.',
        'El primer Escape solo sale de pantalla completa. Mantenerlo pulsado no cierra el resultado; otra pulsación vuelve a la selección.',
        'Sin indicación Escape duplicada ni marco automático al abrir el resultado; el foco Tab sigue visible. Botones completos y espacio inferior accesibles en pantallas bajas.',
      ],
    },
  },
  {
    version: '0.2.10',
    date: '2026-11-07',
    notes: {
      en: [
        'Installable as a desktop app (PWA) and as a local offline app. Installation support varies by browser; an update applies after old app windows close.',
        'Prepared music is saved on this device, so repeat visits and offline play skip the earlier loading wait once you start a song. If the saved data is cleared or runs out of space, the music is prepared again.',
        'Replaced every native dropdown with the same keyboard-accessible custom menu, including language, speed, fade, shuffle and patch-note language. All release notes now have feature/improvement and bug-fix sections in 13 languages.',
      ],
      ko: [
        '데스크톱에 설치 가능한 PWA와 로컬 오프라인 앱을 추가했습니다. 설치 지원은 브라우저마다 다르며 업데이트는 이전 앱 창을 닫은 뒤 적용됩니다.',
        '한 번 준비한 곡은 기기에 저장되어 다시 방문하거나 오프라인에서도 곡을 시작하면 기존 로딩 대기 없이 빠르게 재생됩니다. 저장 데이터가 지워지거나 공간이 부족하면 다시 준비합니다.',
        '언어·속도·효과·섞기·패치노트 언어의 모든 드롭다운을 같은 키보드 지원 커스텀 메뉴로 바꿨습니다. 13개 언어 전 버전 기록을 기능 개선/추가와 버그 수정으로 나눴습니다.',
      ],
      zh: [
        '新增可在桌面安装的PWA应用与本地离线应用。安装支持因浏览器而异，更新在旧应用窗口关闭后生效。',
        '准备好的音乐保存在设备上，再次访问或离线时开始歌曲即可跳过以往的加载等待。保存的数据被清除或空间不足时会重新准备。',
        '语言、速度、显示效果、随机及日志语言均改为同一键盘可操作的自定义菜单。13种语言的全部版本记录按功能改进/新增与错误修复分类。',
      ],
      ja: [
        'デスクトップにインストール可能なPWAとローカルオフラインアプリを追加。対応はブラウザー次第で、更新は旧ウィンドウを閉じてから適用。',
        '準備済みの曲は端末に保存され、再訪・オフラインでも曲を始めれば以前の読み込み待ちなしで再生。保存データが消えたり容量不足の場合は再度準備。',
        '言語・速度・表示効果・シャッフル・履歴言語の全ドロップダウンを同じキーボード対応メニューに変更。13言語の全履歴を機能改善/追加と不具合修正に分類。',
      ],
      es: [
        'Instalable como app de escritorio (PWA) y como app local sin conexión. El soporte varía por navegador; la actualización se aplica al cerrar las ventanas antiguas.',
        'La música preparada se guarda en el dispositivo: al volver o jugar sin conexión, la canción empieza sin la espera de carga anterior. Si los datos guardados se borran o falta espacio, se preparan de nuevo.',
        'Todos los desplegables comparten un menú personalizado accesible por teclado. Historial completo en 13 idiomas separado en funciones/mejoras y correcciones.',
      ],
    },
  },
  {
    version: '0.2.9',
    date: '2026-11-07',
    notes: {
      en: [
        'Fast notes no longer leave duplicate trails between frames and show as one sharp note head; holds, paused scenes and low speeds are unchanged.',
        'Result screens show the song, key mode, difficulty and recorded speed/shuffle/fade options. Retrying a shared result restores that chart and those options instead of the home view. Removed duplicate completion text.',
        'Settings fit better on short landscape screens. Judgment thresholds are unchanged.',
      ],
      ko: [
        '고속 노트가 화면 사이에 겹친 잔상 없이 선명한 하나로 표시됩니다. 홀드·정지·저속은 그대로입니다.',
        '결과에 곡·키 모드·난이도·기록된 속도/섞기/효과를 표시합니다. 공유 결과의 다시 플레이가 첫 화면 대신 해당 채보와 옵션으로 시작합니다. 완료 문구 중복을 없앴습니다.',
        '짧은 가로 화면의 설정 배치를 줄였습니다. 판정 기준은 그대로입니다.',
      ],
      zh: [
        '高速音符不再留下重复残影，显示为单个清晰音符；长按、暂停及低速不变。',
        '成绩显示歌曲、键数、难度及记录的速度、随机和显示效果。分享成绩的重试恢复对应谱面与设置，不再显示首页。删除重复完成文字。',
        '矮横屏的设置布局更紧凑。判定标准不变。',
      ],
      ja: [
        '高速ノートが重複した残像なしに鮮明な一つで表示されます。ホールド・停止・低速はそのままです。',
        '結果に曲・キー数・難易度・記録された速度/シャッフル/表示効果を表示。共有結果の再プレイはホームではなく同じ譜面と設定を復元。完了文の重複を削除。',
        '低い横画面の設定を省スペース化。判定基準は維持。',
      ],
      es: [
        'Las notas rápidas ya no dejan rastros duplicados y se muestran como una sola nota nítida; sin cambios en notas mantenidas, pausa o baja velocidad.',
        'Resultados con canción, teclas, dificultad y velocidad/mezcla/efecto registrados. Reintentar desde un enlace restaura la partida, no el inicio. Eliminado texto duplicado.',
        'Ajustes más compactos en horizontal bajo. Umbrales de juicio sin cambios.',
      ],
    },
  },
  {
    version: '0.2.8',
    date: '2026-11-07',
    notes: {
      en: [
        'Game-end and shared links now use the same result screen. Larger judgment labels, no link field, privacy paragraph or performance readout. Copy feedback stays above the result dialog.',
        'Settings fit without scrolling, using tabs on narrow short screens. Loading hides the old wallpaper until the new track image is ready.',
        'Shared result links open entirely in the browser, and old result links keep working. Smoother frame display without changing charts, speed or judgments.',
      ],
      ko: [
        '게임 직후와 공유 링크에 같은 결과 화면을 표시합니다. 판정 글자를 키우고 링크 입력란·개인정보 설명·성능 수치를 없앴습니다. 복사 알림은 결과 창 위에 보입니다.',
        '설정은 스크롤 없이 배치하고 좁고 짧은 화면에서는 탭으로 나눕니다. 새 곡 배경이 준비될 때까지 이전 이미지를 숨깁니다.',
        '공유 결과 링크는 브라우저 안에서 바로 열리며 예전 결과 링크도 그대로 열립니다. 채보·속도·판정은 유지하면서 화면 표시를 더 부드럽게 했습니다.',
      ],
      zh: [
        '游戏结束与分享链接使用同一成绩界面。判定文字加大，移除链接输入框、隐私说明和性能数据，复制提示显示在成绩窗口上方。',
        '设置无需滚动；窄而矮的屏幕使用标签页。新歌曲背景就绪前隐藏旧图。',
        '分享的成绩链接直接在浏览器中打开，旧链接也继续可用。在不改变谱面、速度和判定的情况下让画面更流畅。',
      ],
      ja: [
        'プレイ直後と共有リンクで同じ結果画面を表示。判定文字を拡大し、リンク欄・個人情報説明・性能値を削除。コピー通知は結果画面の上に表示。',
        '設定はスクロール不要。狭く低い画面ではタブを使用。新しい曲の背景が準備できるまで前の画像を非表示。',
        '共有結果リンクはブラウザー内でそのまま開き、旧リンクも引き続き利用可能。譜面・速度・判定は変えずに表示を滑らかにしました。',
      ],
      es: [
        'Misma pantalla de resultados al terminar y abrir un enlace. Etiquetas más grandes, sin campo de enlace, texto de privacidad ni datos de rendimiento. Aviso de copia visible sobre el diálogo.',
        'Ajustes sin desplazamiento, con pestañas en pantallas estrechas y bajas. Se oculta el fondo anterior hasta que la nueva imagen está lista.',
        'Los enlaces de resultados se abren directamente en el navegador y los enlaces antiguos siguen funcionando. Imagen más fluida sin cambiar notas, velocidad ni juicios.',
      ],
    },
  },
  {
    version: '0.2.7',
    date: '2026-11-07',
    notes: {
      en: [
        'Added French, German, Portuguese, Italian, Russian, Indonesian, Turkish and Vietnamese. All 13 languages cover menus, settings, results and every release in the website patch notes.',
        'Browser language matching, manual overrides, local font coverage and layouts now include the new languages. Song titles and technical effect names remain unchanged.',
      ],
      ko: [
        '프랑스어·독일어·포르투갈어·이탈리아어·러시아어·인도네시아어·터키어·베트남어를 추가했습니다. 13개 언어로 메뉴·설정·결과·웹사이트 전 버전 패치노트를 제공합니다.',
        '브라우저 언어 자동 적용·직접 선택·로컬 글꼴과 레이아웃을 새 언어까지 확장했습니다. 곡 제목과 기술적인 효과 이름은 유지합니다.',
      ],
      zh: [
        '新增法语、德语、葡萄牙语、意大利语、俄语、印尼语、土耳其语、越南语。13种语言覆盖菜单、设置、成绩及网页全部版本记录。',
        '浏览器语言匹配、手动选择、本地字体和布局扩展到新语言。歌曲标题和效果技术名称保持原样。',
      ],
      ja: [
        'フランス語・ドイツ語・ポルトガル語・イタリア語・ロシア語・インドネシア語・トルコ語・ベトナム語を追加。13言語でメニュー・設定・結果・全リリースのWebパッチノートに対応。',
        'ブラウザー言語判定、手動選択、ローカルフォントとレイアウトを新言語まで拡張。曲名と技術的な効果名は維持。',
      ],
      es: [
        'Añadidos francés, alemán, portugués, italiano, ruso, indonesio, turco y vietnamita: 13 idiomas para menús, ajustes, resultados e historial web completo.',
        'Detección del navegador, selección manual, fuentes locales y diseños ampliados. Se mantienen los títulos de canciones y nombres técnicos de efectos.',
      ],
    },
  },
  {
    version: '0.2.6',
    date: '2026-11-07',
    notes: {
      en: [
        'The result address is now the share link: the icon copies it immediately, and the visible link supports manual copy. Changing the address does not upload results, and opening the link shows the same values. Notes render more sharply at high speeds.',
        'Speed now uses a keyboard-accessible 0.5-step selector, not a slider. Default/reset is 1.5; old exact speeds remain labeled until changed. Browser language is automatic by default, with a manual override and English fallback.',
        'Speed, shuffle and visibility options now have their own icon tiles below the lanes. Larger speed value, dimmed inactive states and hover/focus descriptions; F3 and paused changes remain available.',
        'Share became an accessible icon button. Text on shared result images is clearer. New v2 share links avoid the old image cache; v1 links still open.',
        'Left/center/right settings show miniature layouts without changing saved positions or bindings. Keys display actual symbols such as ␣ , . / instead of code names. Key capture uses fixed buttons with instructions below, avoiding size changes.',
        'Website patch notes cover every release in all five languages. Home and selection provide links without adding a gameplay header.',
      ],
      ko: [
        '결과 화면 주소가 공유 주소와 같아졌습니다. 아이콘은 즉시 링크를 복사하고 직접 복사용 주소도 표시합니다. 주소 변경만으로 결과를 전송하지 않으며 링크를 열면 같은 값이 표시됩니다. 고속 노트가 더 선명하게 표시됩니다.',
        '속도 슬라이더를 0.5 단위 선택형으로 바꿨습니다. 기본/초기화는 1.5이며 기존 속도는 표시대로 유지합니다. 브라우저 언어를 기본으로 따르고 직접 선택/영어 대체를 지원합니다.',
        '속도·노트 섞기·표시 효과를 자체 아이콘 타일로 노트 영역 하단에 배치했습니다. 속도 숫자는 크게, 비활성 상태는 어둡게 표시합니다. 마우스/키보드 설명과 F3 일시정지 변경은 유지합니다.',
        '결과 공유를 접근성 이름이 있는 아이콘 버튼으로 바꿨습니다. 공유 이미지의 글자가 더 선명해졌습니다. 새 v2 링크는 이전 이미지 캐시를 피하며 v1 링크도 열립니다.',
        '왼쪽·중앙·오른쪽 선택에 작은 레이아웃을 표시합니다. 저장 위치와 실제 키 배정은 유지하고 키 이름은 ␣ , . / 같은 실제 기호로 표시합니다. 입력 대기는 고정 크기 버튼과 별도 안내로 표시해 크기 변화를 막습니다.',
        '모든 출시 기록을 지원 5개 언어의 웹 패치노트로 제공합니다. 홈과 곡 선택에서 접근하며 플레이 헤더는 추가하지 않습니다.',
      ],
      zh: [
        '结果地址即分享地址，图标立即复制并显示可手动复制的链接。改地址不上传结果，打开链接显示相同值。高速音符显示更清晰。',
        '速度改为0.5步长选择器，不再使用滑块。默认/重置为1.5，旧速度保留并标注。默认跟随浏览器语言，可手动选择，不支持时使用英语。',
        '速度、轨道随机和显示效果改为轨道底部的原创图标卡片。速度数字更大，关闭状态更暗，悬停和键盘聚焦显示说明，保留 F3 暂停设置。',
        '分享按钮改为带无障碍名称的图标。成绩图片文字更清晰。新 v2 链接避开旧图片缓存，v1 仍可打开。',
        '左、中、右位置选择显示缩略布局，不改变已保存位置或按键。按键显示 ␣ , . / 等实际符号。绑定时固定按钮尺寸，说明置于下方，避免布局跳动。',
        '网页更新日志以五种语言提供所有版本记录。从首页和选曲页进入，不添加游戏中页眉。',
      ],
      ja: [
        '結果のURLと共有URLを統一。アイコンで即コピーでき、手動コピー用リンクも表示。URL変更だけでは送信せず、リンクで同じ値を表示。高速ノートがより鮮明に表示されます。',
        '速度をスライダーから0.5刻みの選択式に変更。初期/リセットは1.5、旧値は明示して保持。標準でブラウザー言語に従い、手動選択と英語フォールバックに対応。',
        '速度・配置・表示効果をレーン下の独自アイコンタイルに変更。速度を大きく、無効状態を暗く表示し、ホバーとキーボード説明、F3の一時停止設定を維持。',
        '共有をアクセシブルなアイコンボタンに変更。結果画像の文字がより鮮明に。新しいv2リンクは旧キャッシュを回避し、v1も利用可能。',
        '左・中央・右の選択を小さなレイアウト図で表示。保存位置と実際のキー設定は維持し、キーは ␣ , . / などの記号で表示。入力待ちはボタンを固定し、説明を下に分離してサイズ変更を防止。',
        '全リリースのパッチノートを5言語で掲載。ホームと選曲から開け、プレイ中のヘッダーは追加しません。',
      ],
      es: [
        'La dirección del resultado es el enlace compartido: el icono lo copia y permite copia manual. Cambiar la URL no sube datos; abrirla muestra los mismos valores. Las notas rápidas se ven con más nitidez.',
        'Velocidad por selección en pasos de 0,5, sin deslizador. Inicio/reinicio 1,5; valores anteriores se conservan identificados. Idioma del navegador por defecto, selección manual y respaldo en inglés.',
        'Iconos originales de velocidad, mezcla y visibilidad bajo las pistas. Velocidad grande, estados apagados tenues y ayuda al pasar el cursor o enfocar; F3 y cambios en pausa se mantienen.',
        'Compartir usa un botón de icono accesible. El texto de las imágenes compartidas es más nítido. Los enlaces v2 evitan la caché anterior; v1 sigue funcionando.',
        'La posición izquierda/centro/derecha muestra miniaturas, sin cambiar posiciones ni teclas guardadas. Las teclas usan símbolos como ␣ , . /. La captura mantiene el tamaño del botón y muestra las instrucciones debajo.',
        'Notas web de todas las versiones en cinco idiomas, accesibles desde inicio y selección, sin añadir cabecera al juego.',
      ],
    },
  },
  {
    version: '0.2.5',
    date: '2026-11-07',
    notes: {
      en: [
        'Share your result with score, accuracy and maximum combo as a link with a social preview card. No identity, timestamps or device data; results stay local and are not leaderboard records. Nothing is sent before you press Share.',
        'Original song wallpapers and titles now appear while loading finishes. Fixed input and focus handling during preparation and keyboard Back focus on the result screen.',
      ],
      ko: [
        '점수·정확도·최대 콤보를 미리보기 카드가 있는 링크로 공유할 수 있습니다. 신원·시간·장치 정보는 없고 로컬 결과이며 순위 기록이 아닙니다. 공유를 누르기 전에는 아무것도 전송하지 않습니다.',
        '로딩이 끝날 때까지 자체 곡 배경 3종과 제목을 표시합니다. 준비 중 입력/포커스 문제와 결과 화면 키보드 뒤로 가기를 보완했습니다.',
      ],
      zh: [
        '可将分数、准确率和最大连击通过带预览卡片的链接分享。无身份、时间或设备数据；本地成绩不作为排行榜记录。点击分享前不发送任何内容。',
        '加载完成前显示三首歌曲的原创壁纸和标题。修复准备阶段的输入/焦点问题以及结果页的键盘返回焦点。',
      ],
      ja: [
        'スコア・精度・最大コンボをプレビューカード付きリンクで共有。個人・時刻・端末情報は含まず、ランキング記録ではありません。共有を押すまで送信されません。',
        '読み込み完了まで3曲の独自壁紙とタイトルを表示。準備中の入力とフォーカス、結果の戻るキーフォーカスを改善。',
      ],
      es: [
        'Comparte tu resultado con puntuación, precisión y combo máximo como enlace con tarjeta de vista previa. Sin identidad, hora ni datos del dispositivo; los resultados no son registros de clasificación. No se envía nada antes de pulsar Compartir.',
        'Fondos y títulos originales mientras termina la carga. Corrección de entrada/foco durante la preparación y foco de Volver en resultados.',
      ],
    },
  },
  {
    version: '0.2.4',
    date: '2026-11-07',
    notes: {
      en: [
        'Gameplay shows current speed, shuffle and visibility with click/F3 access. Opening options pauses audio and scoring. Speed/visibility apply without replacing chart, holds or score; shuffle needs explicit restart, or cancel keeps the old chart. Fixed a delayed dialog-close issue and updated instructions.',
      ],
      ko: [
        '플레이 중 속도·섞기·표시 값을 보고 클릭/F3으로 변경합니다. 옵션을 열면 음악과 판정이 정지합니다. 속도/표시는 채보·홀드·점수를 유지하며 적용하고 섞기는 명시적 재시작 또는 취소로 기존 채보를 유지합니다. 창 닫기 지연 문제와 설명을 수정했습니다.',
      ],
      zh: [
        '游戏中显示速度、随机和效果，点击/F3打开并暂停音频与判定。速度/效果不替换谱面、长按或分数；随机需确认重开，取消保留旧谱面。修复对话框延迟关闭的问题并更新说明。',
      ],
      ja: [
        'プレイ中に速度・配置・表示値を確認しクリック/F3で変更。音声と判定を一時停止。速度/表示は譜面・ホールド・得点を維持し、配置変更は明示的な再開始が必要。取消で旧譜面を保持。遅延クローズ問題と説明を修正。',
      ],
      es: [
        'Valores de velocidad, mezcla y visibilidad en juego, acceso por clic/F3 y pausa de audio/puntuación. Velocidad/visibilidad mantienen notas, sostenidos y puntos; mezclar exige reinicio explícito o cancelar conserva el gráfico. Corregido un cierre tardío de diálogos y documentación.',
      ],
    },
  },
  {
    version: '0.2.3',
    date: '2026-11-07',
    notes: {
      en: [
        'Separate F3 game options: speed 1.0–9.0 in 0.1 steps, FADE IN/IN2/OUT/OUT2, MIRROR and seeded RANDOM. Full-chart lane permutations preserve holds/chords and URL seeds. Speed moved out of F2; new/reset fields default left, saved positions remain.',
        'Fixed slow hold rendering. Effect names and approximate fade regions reference community RESPECT V documentation and are not exact timing/render matches. Seven straight lanes are an Orvio-specific mode; other modifiers are not claimed.',
      ],
      ko: [
        'F3 게임 옵션: 속도 1.0~9.0/0.1 간격, FADE IN/IN2/OUT/OUT2, MIRROR와 시드 고정 RANDOM. 홀드/동시 노트를 보존하는 전체 레인 치환과 URL 시드를 제공합니다. 속도는 F2에서 분리하고 새 값/초기화는 왼쪽, 저장 위치는 유지합니다.',
        '홀드 표시가 느려지던 성능 문제를 수정했습니다. 명칭/대략적 표시 구간은 커뮤니티 RESPECT V 자료 참고이며 정확한 동작 복제는 아닙니다. 7레인은 자체 모드이고 다른 효과는 구현했다고 주장하지 않습니다.',
      ],
      zh: [
        '独立 F3 选项：速度1.0–9.0、步长0.1，FADE IN/IN2/OUT/OUT2、MIRROR和固定种子RANDOM。全谱轨道置换保留长按/和弦并写入URL。速度移出F2；新建/重置靠左，保留已存位置。',
        '修复长按显示的性能问题。名称和近似可见区域参考社区RESPECT V文档，并非精确复刻。七直轨为自定义模式，不宣称支持其他效果。',
      ],
      ja: [
        'F3専用設定：速度1.0–9.0を0.1刻み、FADE IN/IN2/OUT/OUT2、MIRRORと固定シードRANDOM。全譜面の一対一配置でホールド/同時押しとURLシードを保持。速度をF2から分離。初期/リセットは左、保存位置は維持。',
        'ホールド表示の性能問題を修正。名称と概略表示領域はコミュニティ資料参考で完全再現ではありません。7直線レーンは独自モードで他効果の実装主張なし。',
      ],
      es: [
        'Opciones F3: velocidad 1,0–9,0 en pasos de 0,1, FADE IN/IN2/OUT/OUT2, MIRROR y RANDOM con semilla. Permutaciones completas conservan sostenidos/acordes y semilla en URL. Velocidad sale de F2; nuevo/reiniciado a la izquierda, posiciones guardadas intactas.',
        'Corregido el rendimiento al mostrar sostenidos. Nombres y regiones aproximadas vienen de documentación comunitaria RESPECT V, no paridad exacta. Siete pistas rectas son propias; no se afirman otros modificadores.',
      ],
    },
  },
  {
    version: '0.2.2',
    date: '2026-11-07',
    notes: {
      en: [
        'Independent 5/7-key binding rows, consecutive capture and advance, duplicate/repeat checks and Escape cancel. Removed chart/selection copy buttons but kept address-bar routes/history. Home start requests fullscreen in the original click/Enter gesture and preserves it across same-page selection; denied/unsupported fullscreen does not block play.',
      ],
      ko: [
        '5/7키 배정 행을 분리하고 연속 입력/자동 이동, 중복/반복 방지와 Escape 취소를 추가했습니다. 채보/선택 링크 복사 버튼을 제거하되 주소/기록은 유지합니다. 홈 클릭/Enter 제스처에서 전체 화면을 요청하고 곡 선택까지 유지합니다. 거부/미지원이어도 플레이할 수 있습니다.',
      ],
      zh: [
        '独立5/7键设置行，连续绑定、自动前进、重复检查和Escape取消。移除谱面/选曲复制按钮，保留地址和历史。首页点击/Enter时请求并保持全屏到同页选曲；全屏拒绝或不支持不妨碍游戏。',
      ],
      ja: [
        '5/7キー別の設定行、連続入力と自動移動、重複/リピート防止、Escape取消。譜面/選曲コピーを削除しURLと履歴は維持。ホームクリック/Enterの操作で全画面を要求し同ページ選曲でも維持。拒否/非対応でもプレイ可能。',
      ],
      es: [
        'Filas independientes de 5/7 teclas, captura consecutiva, avance automático, rechazo de duplicados/repeticiones y cancelar con Escape. Se quitaron botones de copiar, manteniendo URL/historial. Inicio pide pantalla completa con clic/Enter y la conserva al seleccionar; denegación/no soporte no impide jugar.',
      ],
    },
  },
  {
    version: '0.2.1',
    date: '2026-11-07',
    notes: {
      en: [
        'Whole-pixel lane sizing prevents right-edge clipping on resize. Replaced tall hit beams with a short original burst and removed MAX100 full-field flashes. Broken holds keep a muted remaining body/tail without re-entry or scoring changes.',
      ],
      ko: [
        '레인 너비를 정수 픽셀로 맞춰 리사이즈 오른쪽 잘림을 수정했습니다. 긴 타격 빔은 짧은 자체 효과로 바꾸고 MAX100 전체 영역 번쩍임을 제거했습니다. 실패 홀드는 점수/재진입 변화 없이 남은 몸통/꼬리를 어둡게 유지합니다.',
      ],
      zh: [
        '整数像素轨道避免缩放时右边缘裁切。用短原创打击效果替换长光束，去掉MAX100全场闪光。失败长按保留暗色尾部，不可重入且不改变评分。',
      ],
      ja: [
        '整数ピクセル幅でリサイズ右端切れを修正。長いヒット光を短い独自効果に変更しMAX100全体フラッシュを削除。失敗ホールドの残りを暗く表示し、再入力や採点変更なし。',
      ],
      es: [
        'Anchos enteros evitan recorte del borde derecho al redimensionar. Efecto corto original en vez de haces altos y sin destellos de campo MAX100. Sostenidos fallidos dejan cuerpo/cola atenuados sin reentrada ni cambios de puntuación.',
      ],
    },
  },
  {
    version: '0.2.0',
    date: '2026-11-07',
    notes: {
      en: [
        'Hold heads stay on the judgment line and bodies visible until release. Automatic audible-output synchronization replaces manual calibration, ignores old offsets and accounts for delayed fallback events.',
        'Full track console, gold perfect/red break/graded lane-local effects, audio preview, keyboard menus and pause/settings/resume. Five saved UI languages. Home and song-selection pages with per-chart links that survive refresh and history navigation, on a primary URL and a legacy mirror.',
      ],
      ko: [
        '홀드 머리를 판정선에 고정하고 몸통은 뗄 때까지 보이게 수정했습니다. 수동 보정을 제거하고 이전 offset은 무시하며 출력 지연을 반영하는 자동 싱크로 바꿨습니다.',
        '곡 선택 콘솔, 금색 퍼펙트/빨간 실패/등급별 레인 효과, 미리듣기와 키보드 메뉴·정지·설정·재개를 추가했습니다. 5개 언어 저장, 새로고침·기록에 안전한 홈/곡 선택/채보별 주소와 기본/기존 주소를 제공합니다.',
      ],
      zh: [
        '长按头保持在判定线，尾部直到释放可见。自动可听输出同步取代手动校准，忽略旧偏移并计算回退输入延迟。',
        '完整选曲、金色完美/红色失败/分级轨道效果，预听、键盘菜单和暂停/设置/恢复。五语言保存；首页、选曲和谱面地址在刷新/历史导航下保持安全，提供主站与旧镜像。',
      ],
      ja: [
        'ホールド頭を判定線に保ち、離すまで本体を表示。手動調整を廃止し旧オフセットを無視、遅延イベントも考慮する自動同期に変更。',
        '選曲コンソール、金色Perfect/赤Break/段階別レーン効果、試聴、キーボードメニューと停止/設定/再開。5言語保存。更新/履歴に安全なホーム/選曲/譜面別URLと主URL/旧ミラーを提供。',
      ],
      es: [
        'Cabezas sostenidas en la línea de juicio y cuerpos visibles hasta soltar. Sincronización automática de salida audible sustituye calibración manual, ignora offsets antiguos y considera eventos retrasados.',
        'Consola de selección, perfectos dorados/breaks rojos/efectos por pista, vista previa, menús de teclado y pausa/ajustes/continuar. Cinco idiomas guardados. Páginas de inicio/selección y enlaces por partitura seguros al recargar/navegar, con sitio principal y espejo anterior.',
      ],
    },
  },
  {
    version: '0.1.0',
    date: '2026-11-07',
    notes: {
      en: [
        'First keyboard release: three original synth tracks, 18 easy/normal/hard charts in five/seven lanes with holds. Configurable bindings, position, manual calibration (later removed), judgments, accuracy, combo and results.',
        'Settings are saved on your device; mobile is browse-only. Exact DJMAX timing, hold weighting and rounding are approximations. FPS depends on the device; no multiplayer, saved leaderboard or desktop app.',
      ],
      ko: [
        '첫 키보드 버전: 자체 합성곡 3개, 5/7레인 하·중·상 18채보와 홀드. 키/위치 설정, 수동 보정(이후 제거), 판정·정확도·콤보·결과를 제공합니다.',
        '설정은 기기에 저장되며 모바일은 탐색 전용 안내입니다. 정확한 DJMAX 판정/홀드 가중치/반올림은 근사값입니다. FPS는 기기별이며 멀티플레이·저장 순위·데스크톱 앱은 없습니다.',
      ],
      zh: [
        '首个键盘版本：三首原创合成曲、5/7轨简单/普通/困难共18谱面和长按。可设按键/位置、手动校准（后移除）、判定、准确率、连击和结果。',
        '设置保存在设备上；移动端仅供浏览。DJMAX精确判定/长按权重/舍入为近似实现。FPS取决于设备，无多人、持久排行榜或桌面应用。',
      ],
      ja: [
        '初のキーボード版：独自合成3曲、5/7レーンの低中高18譜面とホールド。キー/位置設定、手動調整（後に廃止）、判定・精度・コンボ・結果。',
        '設定は端末に保存。モバイルは閲覧専用。DJMAXの正確な判定/ホールド比重/丸めは近似値です。FPSは端末依存。マルチ/永続ランキング/デスクトップ版なし。',
      ],
      es: [
        'Primera versión de teclado: tres temas synth originales, 18 partituras fácil/normal/difícil de cinco/siete pistas con sostenidos. Teclas/posición configurables, calibración manual (eliminada después), juicios, precisión, combo y resultados.',
        'Ajustes guardados en tu dispositivo; móvil solo para explorar. Tiempos, pesos de sostenidos y redondeo DJMAX son aproximaciones. FPS depende del dispositivo; sin multijugador, clasificación persistente ni aplicación de escritorio.',
      ],
    },
  },
];

export const PATCH_LABELS: Record<
  Language,
  { title: string; back: string; scope: string }
> = { ...BASE_PATCH_LABELS, ...EXTRA_PATCH_LABELS };
export const PATCHES = [
  PATCH_V019,
  PATCH_V018,
  PATCH_V017,
  NEXT_PATCH,
  PATCH_V015,
  ...BASE_PATCHES.map((p) => ({
    ...p,
    notes: {
      ...p.notes,
      ...Object.fromEntries(
        Object.entries(EXTRA_PATCHES).map(([lang, versions]) => [
          lang,
          versions[p.version],
        ]),
      ),
    } as Record<Language, string[]>,
  })),
];
