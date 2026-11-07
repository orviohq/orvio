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
    scope:
      'Prototype notes. DJMAX timing is approximate; performance depends on the device. YouTube automatic charts are not yet available.',
  },
  ko: {
    title: '패치노트',
    back: '게임으로',
    scope:
      '프로토타입 변경 기록입니다. DJMAX 세부 판정은 자체 근사값이며 성능은 기기에 따라 다릅니다. YouTube 자동 채보는 아직 지원하지 않습니다.',
  },
  zh: {
    title: '更新日志',
    back: '返回游戏',
    scope:
      '原型更新记录。DJMAX 判定为近似实现，性能取决于设备。暂不支持 YouTube 自动谱面。',
  },
  ja: {
    title: 'パッチノート',
    back: 'ゲームに戻る',
    scope:
      'プロトタイプの更新記録です。DJMAX判定は独自の近似で、性能は端末に依存します。YouTube自動譜面は未対応です。',
  },
  es: {
    title: 'Notas de versión',
    back: 'Volver al juego',
    scope:
      'Notas del prototipo. Los tiempos de DJMAX son aproximados y el rendimiento depende del dispositivo. Las partituras automáticas de YouTube aún no están disponibles.',
  },
};
const BASE_PATCHES: {
  version: string;
  date: string;
  notes: Record<Exclude<Language, ExtraLanguage>, string[]>;
}[] = [
  {
    version: '0.2.11',
    date: '2026-11-07',
    notes: {
      en: [
        'Result-only option icons, readable judgment colors, original song wallpaper, genre, BPM and chart note-head count. Explicit preview/play-stop is also available on shared results; hold tails remain judgments, not extra notes.',
        'Actual lane press/release, original audio timing, pauses and effect changes are recorded locally. Shared fragments can replay the same performance through the same engine; exact judgment, score and combo matching is checked. No input, audio or identity is uploaded; old result links do not invent a replay.',
        'The first Escape in fullscreen only leaves fullscreen. Held/repeated Escape cannot also close the result; a later separate press returns to song selection.',
        'Removed the duplicate Escape hint and automatic action focus ring on result entry; Tab focus remains visible. Full action buttons and bottom spacing remain accessible on short screens.',
      ],
      ko: [
        '결과 전용 옵션 아이콘과 판정별 색상, 곡 전용 월페이퍼, 장르·BPM·채보 노트 수를 표시합니다. 공유 결과에서도 미리듣기를 재생·정지할 수 있습니다. 홀드는 시작 노트 1개이며 끝은 별도 판정입니다.',
        '실제 레인 누름·뗌과 원래 오디오 시각, 일시정지·효과 변경을 로컬에 기록합니다. 공유 fragment에서 같은 엔진으로 재생하고 모든 판정·점수·콤보의 일치를 확인합니다. 입력·오디오·신원은 업로드하지 않으며 예전 결과 링크에 리플레이를 만들지 않습니다.',
        '전체화면의 첫 ESC는 전체화면만 종료합니다. 누른 채 반복되어도 결과창은 닫지 않으며 다음 별도 ESC에 곡 선택으로 돌아갑니다.',
        '결과 진입 시 중복 ESC 안내와 자동 버튼 테두리를 없앴으며 Tab 이동 표시는 유지합니다. 작은 화면에서도 버튼 전체와 하단 여백에 접근할 수 있습니다.',
      ],
      zh: [
        '结果显示专用选项图标、判定颜色、原创歌曲壁纸、风格、BPM和谱面音符起点数量。共享结果也可明确播放或停止试听；长按终点是判定而非额外音符。',
        '本地记录真实按下和松开、原始音频时间、暂停及效果变更。共享片段用相同引擎回放并核对全部判定、分数及连击，不上传输入、音频或身份。旧结果链接不虚构回放。',
        '全屏时首次Escape只退出全屏。按住或重复不会关闭结果；之后单独按一次才返回选曲。',
        '移除结果页重复的ESC提示及进入时自动按钮焦点框，保留Tab焦点。短屏可滚动查看完整按钮和底部间距。',
      ],
      ja: [
        '結果専用の設定アイコン、判定色、オリジナル曲壁紙、ジャンル、BPMと譜面ノーツ数を表示。共有結果でも明示的に試聴・停止でき、ホールド終点は追加ノーツでなく判定です。',
        '実際の押下・離上と元の音声時刻、停止や効果変更をローカルに記録。同じエンジンで共有フラグメントを再生し、全判定・得点・コンボの一致を確認。入力・音声・個人情報を送信せず、旧リンクにリプレイを捏造しません。',
        '全画面中の最初のEscapeは全画面だけを終了。押し続けや連打のリピートで結果を閉じず、次の独立した押下で選曲に戻ります。',
        '結果画面の重複ESC案内と自動ボタン枠を削除し、Tabのフォーカスは維持。短い画面でもボタン全体と下余白にアクセスできます。',
      ],
      es: [
        'Iconos de opciones, colores de juicios, fondo original, género, BPM y número de notas en el resultado. Escucha y parada también en resultados compartidos; el final de una nota larga es un juicio adicional, no otra nota.',
        'Registro local de pulsaciones reales, tiempos de audio, pausas y efectos. La repetición compartida usa el mismo motor y comprueba cada juicio, puntuación y combo. Sin subir entrada, audio ni identidad; los enlaces antiguos no inventan repeticiones.',
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
        'Desktop-installable PWA manifest and local static offline shell. Browser installation support varies; an update waits until old app windows close.',
        'Prepared original music is saved on this device with a synthesis version. Warm reload/offline playback reuses it and skips the old loading delay, after an explicit user start. Storage eviction or quota failure falls back to synthesis; no audio or play data is uploaded.',
        'Replaced every visible native dropdown with the same keyboard-accessible custom menu, including language, speed, fade, shuffle and patch-note language. All release notes now have feature/improvement and bug-fix sections in 13 languages, preserving original historical entries.',
      ],
      ko: [
        '데스크톱에 설치 가능한 PWA와 로컬 정적 오프라인 앱을 추가했습니다. 설치 지원은 브라우저마다 다르며 업데이트는 이전 앱 창을 닫은 뒤 적용됩니다.',
        '한 번 준비한 오리지널 곡을 합성 버전과 함께 기기에 저장합니다. 재접속·오프라인에서는 사용자 시작 후 캐시를 재사용하고 기존 로딩 대기를 생략합니다. 저장공간 부족·삭제 시 재합성하며 오디오나 플레이 데이터를 올리지 않습니다.',
        '언어·속도·효과·섞기·패치노트 언어의 모든 드롭다운을 같은 키보드 지원 커스텀 메뉴로 바꿨습니다.13언어 전 버전 기록을 원문 보존하며 기능 개선/추가와 버그 수정으로 나눴습니다.',
      ],
      zh: [
        '新增可在桌面安装的PWA与本地静态离线应用。安装支持因浏览器而异，更新等待旧应用窗口关闭。',
        '准备好的原创音乐按合成版本保存在设备。用户明确开始后，热缓存及离线播放复用音频并跳过旧等待。存储清除或容量不足时重新合成，不上传音频或游玩数据。',
        '语言、速度、显示效果、随机及日志语言均改为同一键盘可操作自定义菜单。13种语言的全部版本按功能改进/新增与错误修复分类，保留历史原文。',
      ],
      ja: [
        'デスクトップにインストール可能なPWAとローカル静的オフラインアプリを追加。対応はブラウザー次第で、更新は旧ウィンドウを閉じてから適用。',
        '準備済みオリジナル曲を合成バージョン付きで端末に保存。明示的な開始後、再訪・オフラインでは再利用して旧待機を省略。容量不足や削除時は再合成し、音声やプレイデータは送信しません。',
        '言語・速度・表示効果・シャッフル・履歴言語の全ドロップダウンを同じキーボード対応メニューに変更。13言語全履歴を原文保持で機能改善/追加と不具合修正に分類。',
      ],
      es: [
        'PWA instalable en escritorio y aplicación estática local sin conexión. El soporte varía por navegador; la actualización espera al cierre de ventanas antiguas.',
        'Música preparada guardada en el dispositivo con versión de síntesis. Inicio explícito y reproducción rápida desde caché, incluso sin conexión. Borrado o falta de espacio provoca nueva síntesis, sin subir audio ni partidas.',
        'Todos los desplegables comparten menú personalizado con teclado. Historial completo en 13 idiomas separado en funciones/mejoras y correcciones, conservando los textos.',
      ],
    },
  },
  {
    version: '0.2.9',
    date: '2026-11-07',
    notes: {
      en: [
        'Continuous high-speed note exposure fills only the gap to the previous frame while retaining one sharp head; holds, paused scenes and low speed remain unchanged. This does not confirm the reported physical-display symptom is resolved.',
        'Result screens show song, key mode, difficulty and recorded speed/shuffle/fade options. Shared-result retry restores the chart and options instead of the home view; old links omit unavailable options. Removed duplicate completion text.',
        'Short landscape settings are more compact. Integration tests compare decoded pixels rather than PNG bytes and sample the audio clock without copying the entire chart; judgment thresholds are unchanged.',
      ],
      ko: [
        '고속 노트는 선명한 머리 하나를 유지하며 직전 프레임 사이의 빈 이동 구간만 이어 표시합니다. 홀드·정지·저속은 그대로이며 실제 화면에서 보고된 현상이 해결됐다는 확인은 아닙니다.',
        '결과에 곡·키 모드·난이도·기록된 속도/섞기/효과를 표시합니다. 공유 결과의 다시 플레이가 첫 화면 대신 해당 채보와 옵션으로 시작합니다. 이전 링크에 없는 옵션은 표시하지 않습니다. 완료 문구 중복을 없앴습니다.',
        '짧은 가로 화면의 설정 배치를 줄였습니다. 통합 시험은 PNG 파일 대신 디코드 픽셀을 비교하고 전체 채보 복사 없이 시계만 읽습니다. 판정 기준은 그대로입니다.',
      ],
      zh: [
        '高速音符仅连接上一帧的移动间隙，保留单个清晰音符头；长按、暂停及低速不变。尚未确认实体屏幕报告的问题已解决。',
        '成绩显示歌曲、键数、难度及记录的速度、随机和显示效果。分享成绩的重试恢复对应谱面与设置，不再显示首页；旧链接缺少的设置不作虚构。删除重复完成文字。',
        '压缩矮横屏设置布局。集成测试比较解码像素而非PNG字节，读取时钟时不复制整个谱面，判定标准不变。',
      ],
      ja: [
        '高速ノートは鮮明な頭を一つ保ち、直前フレームとの移動の隙間だけを接続。ホールド・停止・低速は維持。実画面での症状解決は未確認。',
        '結果に曲・キー数・難易度・記録された速度/シャッフル/表示効果を表示。共有結果の再プレイはホームではなく同じ譜面と設定を復元。旧リンクの欠落値は作りません。完了文の重複を削除。',
        '低い横画面の設定を省スペース化。テストはPNGバイトでなく復号ピクセルを比較し、譜面全体を複製せず時計を参照。判定基準は維持。',
      ],
      es: [
        'Las notas rápidas conectan solo el espacio hasta el cuadro anterior, con una sola cabeza nítida; sin cambios en notas mantenidas, pausa o baja velocidad. El síntoma en pantallas físicas aún no está confirmado como resuelto.',
        'Resultados con canción, teclas, dificultad y velocidad/mezcla/efecto registrados. Reintentar desde un enlace restaura la partida, no el inicio. Enlaces antiguos no inventan opciones ausentes. Eliminado texto duplicado.',
        'Ajustes compactos en horizontal bajo. Pruebas por píxeles decodificados y reloj ligero; umbrales de juicio sin cambios.',
      ],
    },
  },
  {
    version: '0.2.8',
    date: '2026-11-07',
    notes: {
      en: [
        'Game-end and shared links now use the same result screen. Larger judgment labels, no link input, privacy paragraph or performance readout. Copy feedback stays above the result dialog.',
        'Settings fit without scrolling, using tabs on narrow short screens. Loading hides the old wallpaper until the new track image is decoded.',
        'Results are interpreted entirely in the browser from the URL fragment. Removed result server functions and personalized social previews; old result links still open locally. Display-only clock smoothing and cached sizing reduce frame jitter without changing chart, speed or judgment. Physical-display high-speed perception remains unverified.',
      ],
      ko: [
        '게임 직후와 공유 링크에 같은 결과 화면을 표시합니다. 판정 글자를 키우고 링크 입력란·개인정보 설명·성능 수치를 없앴습니다. 복사 토스트는 결과 창 위에 보입니다.',
        '설정은 스크롤 없이 배치하고 좁고 짧은 화면에서는 탭으로 나눕니다. 새 곡 배경을 디코드할 때까지 이전 이미지를 숨깁니다.',
        '결과는 URL의 # 뒤에 담아 브라우저 안에서만 처리합니다. 결과 서버 함수와 개인 점수 미리보기를 없앴고 이전 결과 링크도 로컬에서 엽니다. 시각 시계 보정·크기 캐시로 프레임 흔들림을 줄이며 채보·속도·판정은 유지합니다. 실제 화면의 고속 노트 잔상 해소는 아직 확인되지 않았습니다.',
      ],
      zh: [
        '游戏结束与分享链接使用同一成绩界面。判定文字加大，移除链接输入框、隐私说明和性能数据，复制提示显示在成绩窗口上方。',
        '设置无需滚动；窄而矮的屏幕使用标签页。新歌曲背景解码完成前隐藏旧图。',
        '成绩数据仅在浏览器中解析网址片段。移除成绩服务器函数和个人分数预览，旧链接仍在本地打开。显示时钟平滑和尺寸缓存不改变谱面、速度或判定。实体屏幕高速残影尚未验证解决。',
      ],
      ja: [
        'プレイ直後と共有リンクで同じ結果画面を表示。判定文字を拡大し、リンク欄・個人情報説明・性能値を削除。コピー通知は結果画面の上に表示。',
        '設定はスクロール不要。狭く低い画面ではタブを使用。新しい曲の背景をデコードするまで前の画像を非表示。',
        '結果はURLフラグメントからブラウザー内だけで処理。結果サーバー関数と個人スコアのプレビューを廃止し、旧リンクもローカル表示。描画時計の平滑化とサイズキャッシュは譜面・速度・判定を変更しません。実画面の高速残像解消は未確認。',
      ],
      es: [
        'Misma pantalla de resultados al terminar y abrir un enlace. Etiquetas más grandes, sin campo de enlace, texto de privacidad ni datos de rendimiento. Aviso de copia visible sobre el diálogo.',
        'Ajustes sin desplazamiento, con pestañas en pantallas estrechas y bajas. Se oculta el fondo anterior hasta decodificar el nuevo.',
        'Resultados locales mediante el fragmento de URL. Eliminadas las funciones de servidor y vistas previas con puntuación; enlaces anteriores compatibles. Reloj visual suavizado y tamaño en caché sin cambiar notas, velocidad ni juicio. No se ha verificado la percepción a alta velocidad en pantallas físicas.',
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
        'The result address is now the share URL. The icon copies it immediately, and the visible link supports manual copy. Address changes do not upload results; opening the link shows the same values. Frames clear opaquely and notes align to pixels; physical-display motion remains unverified.',
        'Speed now uses a keyboard-accessible 0.5-step selector, not a slider. Default/reset is 1.5; old exact speeds remain labeled until changed. Browser language is automatic by default, with a manual override and English fallback.',
        'Original speed, shuffle and visibility icon tiles now sit below the note gear. Large speed value, dim inactive states and hover/focus descriptions; F3 and paused changes remain available.',
        'Share is an accessible icon button. Social-result text uses antialiased glyphs rendered at the output sizes, rather than enlarged binary pixels. New v2 share links avoid the old image cache; v1 links still open.',
        'Left/center/right settings show miniature layouts without changing saved positions or bindings. Keys display actual symbols such as ␣ , . / instead of code names. Key capture uses fixed buttons with instructions below, avoiding size changes.',
        'Website patch notes cover every release in all five languages. Home and selection provide links without adding a gameplay header.',
      ],
      ko: [
        '결과 화면 주소가 공유 주소와 같아졌습니다. 아이콘은 즉시 링크를 복사하고 직접 복사용 주소도 표시합니다. 주소 변경만으로 결과를 전송하지 않으며 링크를 열면 같은 값이 표시됩니다. 프레임을 불투명 초기화하고 노트를 픽셀 정렬했으나 실제 디스플레이 고속 지각은 미확인입니다.',
        '속도 슬라이더를 0.5 단위 선택형으로 바꿨습니다. 기본/초기화는 1.5이며 기존 속도는 표시대로 유지합니다. 브라우저 언어를 기본으로 따르고 직접 선택/영어 대체를 지원합니다.',
        '속도·노트 섞기·표시 효과를 자체 아이콘 타일로 노트 영역 하단에 배치했습니다. 속도 숫자는 크게, 비활성 상태는 어둡게 표시합니다. 마우스/키보드 설명과 F3 일시정지 변경은 유지합니다.',
        '결과 공유를 접근성 이름이 있는 아이콘 버튼으로 바꿨습니다. 공유 이미지 글자는 이진 픽셀 확대 대신 출력 크기별 안티앨리어싱을 적용합니다. 새 v2 링크는 이전 이미지 캐시를 피하며 v1 링크도 열립니다.',
        '왼쪽·중앙·오른쪽 선택에 작은 레이아웃을 표시합니다. 저장 위치와 실제 키 배정은 유지하고 키 이름은 ␣ , . / 같은 실제 기호로 표시합니다. 입력 대기는 고정 크기 버튼과 별도 안내로 표시해 크기 변화를 막습니다.',
        '모든 출시 기록을 지원 5개 언어의 웹 패치노트로 제공합니다. 홈과 곡 선택에서 접근하며 플레이 헤더는 추가하지 않습니다.',
      ],
      zh: [
        '结果地址即分享地址，图标立即复制并显示可手动复制的链接。改地址不上传结果，打开链接显示相同值。帧使用不透明清除并对齐像素，实屏高速视觉尚未验证。',
        '速度改为0.5步长选择器，不再使用滑块。默认/重置为1.5，旧速度保留并标注。默认跟随浏览器语言，可手动选择，不支持时使用英语。',
        '速度、轨道随机和显示效果改为轨道底部的原创图标卡片。速度数字更大，关闭状态更暗，悬停和键盘聚焦显示说明，保留 F3 暂停设置。',
        '分享按钮改为带无障碍名称的图标。成绩图片按输出字号抗锯齿渲染，不再放大二值像素。新 v2 链接避开旧图片缓存，v1 仍可打开。',
        '左、中、右位置选择显示缩略布局，不改变已保存位置或按键。按键显示 ␣ , . / 等实际符号。绑定时固定按钮尺寸，说明置于下方，避免布局跳动。',
        '网页更新日志以五种语言提供所有版本记录。从首页和选曲页进入，不添加游戏中页眉。',
      ],
      ja: [
        '結果のURLと共有URLを統一。アイコンで即コピーでき、手動コピー用リンクも表示。URL変更だけでは送信せず、リンクで同じ値を表示。毎フレーム不透明消去とピクセル整列を適用。実画面の高速視覚は未検証。',
        '速度をスライダーから0.5刻みの選択式に変更。初期/リセットは1.5、旧値は明示して保持。標準でブラウザー言語に従い、手動選択と英語フォールバックに対応。',
        '速度・配置・表示効果をレーン下の独自アイコンタイルに変更。速度を大きく、無効状態を暗く表示し、ホバーとキーボード説明、F3の一時停止設定を維持。',
        '共有をアクセシブルなアイコンボタンに変更。結果画像は二値ピクセル拡大ではなく出力サイズ別のアンチエイリアス文字を使用。新しいv2リンクは旧キャッシュを回避し、v1も利用可能。',
        '左・中央・右の選択を小さなレイアウト図で表示。保存位置と実際のキー設定は維持し、キーは ␣ , . / などの記号で表示。入力待ちはボタンを固定し、説明を下に分離してサイズ変更を防止。',
        '全リリースのパッチノートを5言語で掲載。ホームと選曲から開け、プレイ中のヘッダーは追加しません。',
      ],
      es: [
        'La dirección del resultado es el enlace compartido: el icono lo copia y permite copia manual. Cambiar URL no sube datos; abrirla muestra los mismos valores. Limpieza opaca por fotograma y notas alineadas a píxeles; movimiento en pantallas físicas sin verificar.',
        'Velocidad por selección en pasos de 0,5, sin deslizador. Inicio/reinicio 1,5; valores anteriores se conservan identificados. Idioma del navegador por defecto, selección manual y respaldo en inglés.',
        'Iconos originales de velocidad, mezcla y visibilidad bajo las pistas. Velocidad grande, estados apagados tenues y ayuda al pasar el cursor o enfocar; F3 y cambios en pausa se mantienen.',
        'Compartir usa un botón de icono accesible. El texto de resultados se renderiza con suavizado al tamaño final, sin ampliar píxeles binarios. Los enlaces v2 evitan la caché anterior; v1 sigue funcionando.',
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
        'Explicit result sharing with score, accuracy and maximum combo, server-rendered social HTML and 1200×630 PNG previews, plus default site Open Graph metadata. No identity, timestamps or device data; local results are unverified, not leaderboard records. Nothing is sent before Share.',
        'Three original song wallpapers and titles during loading. After image decoding, show at least 0.9 seconds and finish audio/renderer preparation before the clock starts. Guard preparation input/focus loss and preserve result keyboard Back focus.',
      ],
      ko: [
        '점수·정확도·최대 콤보를 명시적으로 공유하며 서버 HTML과 1200×630 PNG 미리보기, 기본 사이트 OG 정보를 제공합니다. 신원·시간·장치 정보는 없고 검증되지 않은 로컬 결과이며 순위 기록이 아닙니다. 공유 전 전송하지 않습니다.',
        '자체 곡 배경 3종과 제목을 로딩 중 표시합니다. 이미지 디코드 후 최소 0.9초 유지하고 음악·렌더러 준비 후 시계를 시작합니다. 준비 중 입력/포커스와 결과 화면 키보드 뒤로 가기를 보완했습니다.',
      ],
      zh: [
        '明确分享分数、准确率和最大连击，提供服务器 HTML、1200×630 PNG 预览和默认 OG 信息。无身份、时间或设备数据；本地成绩未经验证，不是排行榜记录，分享前不发送。',
        '三首歌曲的原创背景和标题用于加载。图片解码后至少显示0.9秒，音频和渲染器准备完成才启动计时。保护准备阶段输入/焦点，并保留结果返回键盘焦点。',
      ],
      ja: [
        'スコア・精度・最大コンボを明示共有。サーバーHTML、1200×630 PNGと標準OG情報を追加。個人・時刻・端末情報は含まず、ローカル未検証結果でランキングではありません。共有前の送信なし。',
        '3曲の独自背景とタイトルをロード中に表示。画像デコード後0.9秒以上維持し、音声・描画準備後に時計を開始。準備中の入力とフォーカス、結果の戻るキーフォーカスを保護。',
      ],
      es: [
        'Compartir explícitamente puntuación, precisión y combo máximo con HTML del servidor, PNG de 1200×630 y metadatos OG. Sin identidad, hora ni datos del dispositivo; resultados locales no verificados, no clasificación. No se envían antes de Compartir.',
        'Tres fondos originales y títulos durante la carga. Tras decodificar la imagen, se muestran al menos 0,9 s y se prepara audio y renderizador antes del reloj. Protección de entrada/foco y foco de Volver en resultados.',
      ],
    },
  },
  {
    version: '0.2.4',
    date: '2026-11-07',
    notes: {
      en: [
        'Gameplay shows current speed, shuffle and visibility with click/F3 access. Opening options pauses audio and scoring. Speed/visibility apply without replacing chart, holds or score; shuffle needs explicit restart, or cancel keeps the old chart/seed. Fixed delayed dialog-close race and updated instructions.',
      ],
      ko: [
        '플레이 중 속도·섞기·표시 값을 보고 클릭/F3으로 변경합니다. 옵션을 열면 음악과 판정이 정지합니다. 속도/표시는 채보·홀드·점수를 유지하며 적용하고 섞기는 명시적 재시작 또는 취소로 기존 채보/시드를 유지합니다. 창 닫기 지연 경쟁 상태와 설명을 수정했습니다.',
      ],
      zh: [
        '游戏中显示速度、随机和效果，点击/F3打开并暂停音频与判定。速度/效果不替换谱面、长按或分数；随机需确认重开，取消保留旧谱面和种子。修复对话框关闭竞态并更新说明。',
      ],
      ja: [
        'プレイ中に速度・配置・表示値を確認しクリック/F3で変更。音声と判定を一時停止。速度/表示は譜面・ホールド・得点を維持し、配置変更は明示的な再開始が必要。取消で旧譜面/シードを保持。遅延クローズ競合と説明を修正。',
      ],
      es: [
        'Valores de velocidad, mezcla y visibilidad en juego, acceso por clic/F3 y pausa de audio/puntuación. Velocidad/visibilidad mantienen notas, sostenidos y puntos; mezclar exige reinicio explícito o cancelar conserva gráfico/semilla. Corregida carrera al cerrar diálogos y documentación.',
      ],
    },
  },
  {
    version: '0.2.3',
    date: '2026-11-07',
    notes: {
      en: [
        'Separate F3 game options: speed 1.0–9.0 in 0.1 steps, FADE IN/IN2/OUT/OUT2, MIRROR and seeded RANDOM. Full-chart bijections preserve holds/chords and URL seeds. Speed moved out of F2; new/reset fields default left, saved positions remain.',
        'GPU masks removed before release in favor of direct hold clipping. Names and approximate fade regions reference community RESPECT V documentation, not exact timing/renderer parity. Seven straight lanes are Orvio-specific; other modifiers are not claimed.',
      ],
      ko: [
        'F3 게임 옵션: 속도 1.0~9.0/0.1 간격, FADE IN/IN2/OUT/OUT2, MIRROR와 시드 고정 RANDOM. 홀드/동시 노트를 보존하는 전체 레인 치환과 URL 시드를 제공합니다. 속도는 F2에서 분리하고 새 값/초기화는 왼쪽, 저장 위치는 유지합니다.',
        '출시 전 GPU 마스크를 제거하고 홀드를 직접 잘라 성능을 수정했습니다. 명칭/대략적 표시 구간은 커뮤니티 RESPECT V 자료 참고이며 정확한 동작 복제는 아닙니다. 7레인은 자체 모드이고 다른 효과는 구현했다고 주장하지 않습니다.',
      ],
      zh: [
        '独立 F3 选项：速度1.0–9.0、步长0.1，FADE IN/IN2/OUT/OUT2、MIRROR和固定种子RANDOM。全谱轨道置换保留长按/和弦并写入URL。速度移出F2；新建/重置靠左，保留已存位置。',
        '发布前移除GPU遮罩，改用长按矩形裁剪修复性能。名称和近似可见区域参考社区RESPECT V文档，并非精确复刻。七直轨为自定义模式，不宣称支持其他效果。',
      ],
      ja: [
        'F3専用設定：速度1.0–9.0を0.1刻み、FADE IN/IN2/OUT/OUT2、MIRRORと固定シードRANDOM。全譜面の一対一配置でホールド/同時押しとURLシードを保持。速度をF2から分離。初期/リセットは左、保存位置は維持。',
        '発売前にGPUマスクを直接ホールド矩形クリップへ変更し性能を修正。名称と概略表示領域はコミュニティ資料参考で完全再現ではありません。7直線レーンは独自モードで他効果の実装主張なし。',
      ],
      es: [
        'Opciones F3: velocidad 1,0–9,0 en pasos de 0,1, FADE IN/IN2/OUT/OUT2, MIRROR y RANDOM con semilla. Permutaciones completas conservan sostenidos/acordes y semilla en URL. Velocidad sale de F2; nuevo/reiniciado a la izquierda, posiciones guardadas intactas.',
        'Se quitaron máscaras GPU a favor de recorte directo de sostenidos para corregir rendimiento. Nombres y regiones aproximadas vienen de documentación comunitaria RESPECT V, no paridad exacta. Siete pistas rectas son propias; no se afirman otros modificadores.',
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
        'Full track console, gold perfect/red break/graded lane-local effects, audio preview, keyboard menus and pause/settings/resume. Five saved UI languages. Static Astro home, selection and 18 unique chart routes with refresh/history safety. Primary URL and legacy mirror, hourly production checks, retained failure evidence and recovery runbook.',
      ],
      ko: [
        '홀드 머리를 판정선에 고정하고 몸통은 뗄 때까지 보이게 수정했습니다. 수동 보정을 제거하고 이전 offset은 무시하며 출력 지연/이벤트 지연을 반영하는 자동 싱크로 바꿨습니다.',
        '곡 선택 콘솔, 금색 퍼펙트/빨간 실패/등급별 레인 효과, 미리듣기와 키보드 메뉴·정지·설정·재개를 추가했습니다. 5언어 저장, Astro 홈/선택/18개 채보 주소와 새로고침/기록 안전성, 기본/기존 주소, 시간별 실서비스 검사·실패 증거·복구 절차를 제공합니다.',
      ],
      zh: [
        '长按头保持在判定线，尾部直到释放可见。自动可听输出同步取代手动校准，忽略旧偏移并计算回退输入延迟。',
        '完整选曲、金色完美/红色失败/分级轨道效果，预听、键盘菜单和暂停/设置/恢复。五语言保存；Astro首页、选曲和18个谱面地址及安全刷新/历史。主站/旧镜像、每小时实站检查、失败证据和恢复流程。',
      ],
      ja: [
        'ホールド頭を判定線に保ち、離すまで本体を表示。手動調整を廃止し旧オフセットを無視、遅延イベントも考慮する自動可聴出力同期に変更。',
        '選曲コンソール、金色Perfect/赤Break/段階別レーン効果、試聴、キーボードメニューと停止/設定/再開。5言語保存。Astroホーム/選曲/18譜面URLと安全な更新/履歴。主URL/旧ミラー、毎時実サイト試験、失敗証拠と復旧手順。',
      ],
      es: [
        'Cabezas sostenidas en la línea de juicio y cuerpos visibles hasta soltar. Sincronización automática de salida audible sustituye calibración manual, ignora offsets antiguos y considera eventos retrasados.',
        'Consola de selección, perfectos dorados/breaks rojos/efectos por pista, vista previa, menús de teclado y pausa/ajustes/continuar. Cinco idiomas guardados. Inicio/selección Astro y 18 URL seguras al recargar/navegar. Sitio principal/espejo, pruebas horarias, evidencia de fallos y recuperación.',
      ],
    },
  },
  {
    version: '0.1.0',
    date: '2026-11-07',
    notes: {
      en: [
        'First keyboard prototype: three original prerendered synth tracks, 18 easy/normal/hard charts in five/seven lanes with holds. Configurable bindings, position, manual calibration (later removed), audible-output clock, judgments, accuracy, combo and results.',
        'Local settings, mobile browse-only guidance, deterministic engine/browser tests, CI, license, contributor/security documentation. Exact DJMAX timing/hold weighting/rounding not established. FPS is device-dependent; no multiplayer, persisted leaderboard or desktop wrapper.',
      ],
      ko: [
        '첫 키보드 프로토타입: 자체 합성곡 3개, 5/7레인 하·중·상 18채보와 홀드. 키/위치 설정, 수동 보정(이후 제거), 출력 시계, 판정·정확도·콤보·결과를 제공합니다.',
        '로컬 설정, 모바일 탐색 전용 안내, 엔진/브라우저 시험, CI, 라이선스·기여·보안 문서를 추가했습니다. 정확한 DJMAX 판정/홀드 가중치/반올림은 미확인입니다. FPS는 기기별이며 멀티플레이·저장 순위·데스크톱 앱은 없습니다.',
      ],
      zh: [
        '首个键盘原型：三首原创合成曲、5/7轨简单/普通/困难共18谱面和长按。可设按键/位置、手动校准（后移除）、输出时钟、判定、准确率、连击和结果。',
        '本地设置、移动端仅浏览提示、确定性引擎/浏览器测试、CI、许可、贡献/安全文档。DJMAX精确判定/长按权重/舍入未验证。FPS取决于设备，无多人、持久排行榜或桌面封装。',
      ],
      ja: [
        '初のキーボード原型：独自合成3曲、5/7レーンの低中高18譜面とホールド。キー/位置設定、手動調整（後に廃止）、出力時計、判定・精度・コンボ・結果。',
        'ローカル設定、モバイル閲覧専用案内、決定的エンジン/ブラウザ試験、CI、ライセンスと貢献/セキュリティ文書。正確なDJMAX判定/ホールド比重/丸めは未確認。FPSは端末依存。マルチ/永続ランキング/デスクトップ版なし。',
      ],
      es: [
        'Primer prototipo: tres temas synth originales prerenderizados, 18 partituras fácil/normal/difícil de cinco/siete pistas con sostenidos. Teclas/posición configurables, calibración manual (eliminada después), reloj audible, juicios, precisión, combo y resultados.',
        'Ajustes locales, móvil solo para explorar, pruebas deterministas/de navegador, CI, licencia y documentación de contribución/seguridad. Sin equivalencia exacta de tiempos/pesos/redondeo DJMAX. FPS depende del dispositivo; sin multijugador, clasificación persistente ni aplicación de escritorio.',
      ],
    },
  },
];

export const PATCH_LABELS: Record<
  Language,
  { title: string; back: string; scope: string }
> = { ...BASE_PATCH_LABELS, ...EXTRA_PATCH_LABELS };
export const PATCHES = BASE_PATCHES.map((p) => ({
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
}));
