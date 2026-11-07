// Full public release history for the additional UI languages.
export const EXTRA_PATCH_LABELS = {
  fr: {
    title: 'Notes de version',
    back: 'Retour au jeu',
    scope: 'Nouveautés d’Orvio.',
  },
  de: {
    title: 'Versionshinweise',
    back: 'Zurück zum Spiel',
    scope: 'Änderungen an Orvio.',
  },
  pt: {
    title: 'Notas da versão',
    back: 'Voltar ao jogo',
    scope: 'Novidades do Orvio.',
  },
  it: {
    title: 'Note di versione',
    back: 'Torna al gioco',
    scope: 'Novità di Orvio.',
  },
  ru: {
    title: 'История версий',
    back: 'Назад к игре',
    scope: 'История изменений Orvio.',
  },
  id: {
    title: 'Catatan versi',
    back: 'Kembali ke permainan',
    scope: 'Riwayat perubahan Orvio.',
  },
  tr: {
    title: 'Sürüm notları',
    back: 'Oyuna dön',
    scope: 'Orvio değişiklikleri.',
  },
  vi: {
    title: 'Ghi chú phiên bản',
    back: 'Trở về trò chơi',
    scope: 'Thay đổi của Orvio.',
  },
};
export type ExtraLanguage = keyof typeof EXTRA_PATCH_LABELS;
export const EXTRA_PATCHES: Record<ExtraLanguage, Record<string, string[]>> = {
  fr: {
    '0.2.14': [
      'Le terrain de jeu est préparé pendant le chargement du morceau pour réduire la pause de la première image au début du jeu et des replays. La synchronisation de la musique et des touches, les partitions, les jugements et les scores restent inchangés.',
    ],
    '0.2.13': [
      'Partager copie un lien court sans fenêtre de vérification ni message d’attente. Le lien ouvre directement le résultat avec son propre aperçu.',
      'Suppression de la traînée translucide des notes rapides, sans changer vitesse, partitions ni jugements. Notes de version plus lisibles, texte sélectionnable et copiable, polices locales complétées.',
    ],
    '0.2.12': [
      'Options par icônes, effets BLINK, BLINK 2, FOG, PIXEL, PIXEL 2 et BLIND proches du jeu original sans lui être identiques. Fond de chanson aussi pendant le jeu et à chaque visite. Animation du score sans modifier le score réel ni les jugements.',
      'Échap conserve le plein écran si Keyboard Lock est autorisé. Sans prise en charge ou permission, le navigateur peut le quitter. Sélection et glissement du texte bloqués dans le jeu, dialogues compris ; notes dans un nouvel onglet.',
      'Un replay manquant ou endommagé reste marqué comme indisponible. Seul le clic Partager envoie le résultat et le replay pour créer un lien court.',
    ],
    '0.2.11': [
      'Icônes des options, couleurs des jugements, fond original, genre, BPM et nombre de notes dans le résultat. Écoute et arrêt disponibles aussi via le lien partagé ; la fin des notes longues reste un jugement.',
      'Enregistrement sur l’appareil des appuis réels, temps audio, pauses et effets. Le lien partagé rejoue la même partie dans le même moteur, avec les mêmes jugements, score et combo. Les enregistrements restent sur l’appareil et les anciens liens n’ont pas de replay.',
      'Le premier Échap quitte uniquement le plein écran. Un appui maintenu ne ferme pas le résultat ; un nouvel appui revient au choix du morceau.',
      'Suppression du rappel Échap en double et du cadre automatique au résultat ; le focus Tab reste visible. Boutons entiers et marge basse accessibles sur écran court.',
    ],
    '0.2.10': [
      'Installable comme application de bureau (PWA) et application locale hors ligne. La prise en charge varie selon le navigateur ; la mise à jour s’applique après la fermeture des anciennes fenêtres.',
      'La musique préparée est conservée sur l’appareil : lors d’une nouvelle visite ou hors ligne, le morceau démarre sans l’ancienne attente. Si les données sont effacées ou manquent de place, la musique est préparée à nouveau.',
      'Tous les menus déroulants utilisent le même composant clavier. Historique en 13 langues séparé en fonctionnalités/améliorations et corrections.',
    ],
    '0.2.9': [
      'Les notes rapides ne laissent plus de traces doubles et s’affichent comme une seule tête nette. Maintiens, pause et basse vitesse inchangés.',
      'Résultat avec morceau, touches, difficulté et options enregistrées. Rejouer un lien restaure la partition et les options, pas l’accueil. Texte doublé supprimé.',
      'Réglages compacts en paysage bas. Seuils de jugement inchangés.',
    ],
    '0.2.8': [
      'Même écran de résultat après le jeu et via le lien partagé. Libellés agrandis, sans champ de lien, texte de confidentialité ni mesures de performance. Notification de copie visible.',
      'Réglages sans défilement, avec onglets sur les écrans étroits et courts. Ancien fond masqué jusqu’à la disponibilité du nouveau.',
      'Les liens de résultats s’ouvrent entièrement dans le navigateur et les anciens liens continuent de fonctionner. Affichage plus fluide sans changer notes, vitesse ni jugements.',
    ],
    '0.2.7': [
      'Ajout du français, allemand, portugais, italien, russe, indonésien, turc et vietnamien : 13 langues pour les menus, réglages, résultats et tout l’historique des versions.',
      'La détection du navigateur, le choix manuel, les polices locales et les mises en page sont étendus aux nouvelles langues. Les titres de morceaux et les noms techniques des effets restent inchangés.',
    ],
    '0.2.6': [
      'La vitesse utilise un sélecteur par pas de 0,5, sans curseur. Valeur initiale/réinitialisée : 1,5. Les anciennes valeurs exactes restent signalées jusqu’au changement. Langue du navigateur par défaut, choix manuel et anglais si aucune langue ne correspond.',
      'Trois icônes originales sous les pistes indiquent vitesse, mélange et visibilité, avec valeur de vitesse plus grande, états inactifs atténués et descriptions au survol/focus. F3 et les modifications en pause restent disponibles.',
      'Partage par icône avec copie immédiate. L’adresse du résultat est le lien partagé, également affiché pour copie manuelle. Changer l’adresse ne transmet rien ; ouvrir le lien affiche les mêmes valeurs. Texte des images partagées plus net ; nouveaux liens v2, anciens liens v1 conservés.',
      'Miniatures gauche/centre/droite, symboles réels des touches, boutons de saisie fixes et consigne séparée évitent les déplacements. Historique web complet dans les cinq langues de cette version, accessible depuis l’accueil et la sélection sans en-tête de jeu. Notes rapides plus nettes.',
    ],
    '0.2.5': [
      'Partage explicite du score, de la précision et du combo maximal via un lien avec carte d’aperçu. Aucun identifiant, horodatage ou appareil. Résultats locaux, sans classement ; rien envoyé avant Partager.',
      'Trois fonds de morceaux originaux et leurs titres pendant le chargement. Protection des entrées et du focus ; focus clavier sur Retour aux résultats.',
    ],
    '0.2.4': [
      'Valeurs vitesse/mélange/visibilité en jeu, accès clic/F3 qui suspend audio et score. Vitesse/visibilité sans remplacer les notes, notes tenues ou score. Mélange avec confirmation de redémarrage ; annuler conserve la partition. Correction de la fermeture différée des fenêtres et des instructions.',
    ],
    '0.2.3': [
      'Options F3 distinctes : vitesse 1,0–9,0 par 0,1, FADE IN/IN2/OUT/OUT2, MIRROR et RANDOM déterministe. Une permutation bijective conserve notes tenues/accords et graine URL. Vitesse retirée de F2 ; champs nouveaux/réinitialisés à gauche, positions enregistrées conservées.',
      'Correction des ralentissements d’affichage des notes tenues. Noms et zones approximatives d’après la documentation communautaire RESPECT V, sans équivalence exacte de rendu/temps. Les sept pistes droites sont propres à Orvio ; aucun autre effet revendiqué.',
    ],
    '0.2.2': [
      'Rangées de 5/7 touches indépendantes, saisie successive et avance automatique, détection de doublons/répétitions et annulation Échap. Suppression des boutons de copie de partition/sélection, sans supprimer URL ni historique. Démarrage plein écran dans le clic/Entrée initial et maintien vers la sélection ; refus ou absence de plein écran ne bloque pas le jeu.',
    ],
    '0.2.1': [
      'Largeurs entières pour éviter de couper le bord droit au redimensionnement. Effet court original à la place des longs faisceaux, suppression des flashs MAX100 sur tout le terrain. Les notes tenues ratées gardent une fin atténuée, sans reprise ni changement de score.',
    ],
    '0.2.0': [
      'Têtes des notes tenues sur la ligne et corps visibles jusqu’au relâchement. Synchronisation automatique avec la sortie audible, suppression du réglage manuel et des anciens décalages, prise en compte des événements retardés.',
      'Console de sélection, parfait doré/raté rouge/effets locaux gradués, extraits audio, menus clavier et pause/réglages/reprise. Cinq langues enregistrées ; pages d’accueil/sélection et liens par partition sûrs au rechargement/navigation, sur un site principal et un ancien miroir.',
    ],
    '0.1.0': [
      'Première version clavier : trois morceaux de synthèse originaux, 18 partitions facile/normale/difficile à 5/7 pistes avec notes tenues. Touches, position, calibration manuelle (retirée ensuite), jugements, précision, combo et résultats.',
      'Réglages enregistrés sur l’appareil ; mobile réservé à la consultation. Temps, pondération des notes tenues et arrondis DJMAX sont des approximations. FPS selon l’appareil ; pas de multijoueur, classement persistant ni application de bureau.',
    ],
  },
  de: {
    '0.2.14': [
      'Das Spielfeld wird während des Ladens vorbereitet, um den Ruckler im ersten Bild beim Spielstart und bei Replays zu verringern. Musik- und Eingabetiming, Notenfolgen, Wertungen und Punkte bleiben unverändert.',
    ],
    '0.2.13': [
      'Teilen kopiert einen kurzen Ergebnislink ohne Prüfungsfenster oder Wartetext. Links öffnen direkt das Ergebnis mit einer eigenen Vorschaukarte.',
      'Die durchscheinende Spur schneller Noten wurde entfernt. Geschwindigkeit, Charts und Wertungen bleiben gleich. Klarere Versionshinweise mit auswählbarem und kopierbarem Text sowie ergänzten lokalen Schriftzeichen.',
    ],
    '0.2.12': [
      'Symbolauswahl, angenäherte BLINK/FOG/PIXEL/BLIND-Effekte, Songhintergrund auch im Spiel und bei jedem Besuch. Punkteanimation ändert weder Punkte noch Wertung.',
      'Kurzes Escape behält Vollbild bei erlaubtem Keyboard Lock. Ohne Unterstützung oder Erlaubnis kann der Browser Vollbild verlassen. Keine Textauswahl oder Ziehen im Spiel, einschließlich Dialogen; Versionshinweise in neuem Tab.',
      'Fehlende oder beschädigte Replays bleiben als nicht verfügbar markiert. Nur Teilen lädt Ergebnis und Replay hoch, um einen kurzen Link zu erstellen.',
    ],
    '0.2.11': [
      'Optionssymbole, Wertungsfarben, eigener Titelhintergrund, Genre, BPM und Notenanzahl im Ergebnis. Vorhören und Stoppen auch bei geteilten Ergebnissen; Haltenoten-Enden zählen als Wertungen.',
      'Echte Tastendrücke, Audiozeiten, Pausen und Effekte werden auf dem Gerät aufgezeichnet. Ein geteilter Link spielt dieselbe Partie in derselben Engine mit denselben Wertungen, Punkten und Combo erneut ab. Aufzeichnungen bleiben auf dem Gerät; alte Links haben keine Wiederholung.',
      'Das erste Escape verlässt nur den Vollbildmodus. Gedrückthalten schließt das Ergebnis nicht; ein neuer Druck führt zur Titelauswahl.',
      'Doppelten Escape-Hinweis und automatischen Tastenrahmen beim Ergebnis entfernt; Tab-Fokus bleibt sichtbar. Ganze Tasten und unterer Abstand sind auch auf kurzen Bildschirmen erreichbar.',
    ],
    '0.2.10': [
      'Installierbar als Desktop-App (PWA) und lokale Offline-App. Unterstützung je Browser; Updates warten auf das Schließen alter Fenster.',
      'Vorbereitete Musik bleibt auf dem Gerät: Bei erneuten Besuchen und offline startet der Titel ohne die frühere Wartezeit. Gelöschte Daten oder Platzmangel führen zur erneuten Vorbereitung.',
      'Alle Auswahllisten durch einheitliche Tastaturmenüs ersetzt. Gesamter Verlauf in 13 Sprachen nach Funktionen/Verbesserungen und Fehlerbehebungen gegliedert.',
    ],
    '0.2.9': [
      'Schnelle Noten hinterlassen keine doppelten Spuren mehr und zeigen einen scharfen Kopf. Halten, Pause und langsame Noten unverändert.',
      'Ergebnis zeigt Titel, Tasten, Schwierigkeit und gespeicherte Optionen. Erneutes Spielen geteilter Ergebnisse stellt Chart und Optionen wieder her statt der Startseite. Doppelter Text entfernt.',
      'Kompaktere Einstellungen im niedrigen Querformat. Wertungsgrenzen bleiben gleich.',
    ],
    '0.2.8': [
      'Gleiche Ergebnisansicht nach dem Spiel und im geteilten Link. Größere Wertungsbeschriftung, kein Linkfeld, Datenschutztext oder Leistungswerte. Kopiermeldung über dem Dialog.',
      'Einstellungen ohne Scrollen, mit Tabs auf schmalen niedrigen Bildschirmen. Alter Hintergrund bleibt bis zum neuen Bild verborgen.',
      'Geteilte Ergebnislinks öffnen direkt im Browser, alte Links funktionieren weiter. Flüssigere Anzeige ohne Änderung an Noten, Tempo oder Wertung.',
    ],
    '0.2.7': [
      'Französisch, Deutsch, Portugiesisch, Italienisch, Russisch, Indonesisch, Türkisch und Vietnamesisch ergänzt: 13 Sprachen für Menüs, Einstellungen, Ergebnisse und die vollständige Versionsgeschichte.',
      'Browsererkennung, manuelle Auswahl, lokale Schriftarten und Layouts unterstützen die neuen Sprachen. Titelnamen und technische Effektnamen bleiben unverändert.',
    ],
    '0.2.6': [
      'Tempo als Auswahl in 0,5-Schritten statt Schieberegler. Anfangs-/Rücksetzwert 1,5; alte genaue Werte bleiben bis zur Änderung gekennzeichnet. Standardmäßig Browsersprache, mit manueller Auswahl und Englisch als Ersatz.',
      'Drei eigene Symbole unter den Spuren für Tempo, Reihenfolge und Sichtbarkeit. Große Tempoanzeige, gedimmte inaktive Zustände und Hinweise bei Maus-/Tastaturfokus. F3 und Änderungen in Pause bleiben erhalten.',
      'Teilen-Symbol kopiert sofort. Die Ergebnisadresse ist die Freigabeadresse, auch zum manuellen Kopieren sichtbar. URL-Änderung sendet nichts; Öffnen zeigt dieselben Werte. Schärfere Schrift auf geteilten Bildern; neue v2-Links, alte v1-Links weiterhin gültig.',
      'Miniaturen für links/Mitte/rechts, echte Tastensymbole, feste Eingabefelder und separate Hinweise verhindern Layoutsprünge. Web-Versionsgeschichte in den damaligen fünf Sprachen über Start/Auswahl, ohne Spielkopfzeile. Schärfere Anzeige schneller Noten.',
    ],
    '0.2.5': [
      'Ausdrückliches Teilen von Punkten, Genauigkeit und maximaler Kombo als Link mit Vorschaukarte. Keine Identität, Zeit- oder Gerätedaten. Lokale Ergebnisse, keine Rangliste; kein Versand vor Teilen.',
      'Drei eigene Titelhintergründe beim Laden. Eingabe-/Fokusschutz während der Vorbereitung und Tastaturfokus für Zurück im Ergebnis.',
    ],
    '0.2.4': [
      'Aktuelle Tempo-/Spur-/Sichtbarkeitswerte im Spiel per Klick/F3; Optionen pausieren Audio und Wertung. Tempo/Sichtbarkeit ohne neue Noten, Haltenoten oder Punkte. Spuränderung mit bestätigtem Neustart, Abbruch erhält den Chart. Verzögertes Dialogschließen und Anleitung korrigiert.',
    ],
    '0.2.3': [
      'Eigene F3-Optionen: Tempo 1,0–9,0 in 0,1-Schritten, FADE IN/IN2/OUT/OUT2, MIRROR und RANDOM mit Seed. Bijektive Spurfolge erhält Haltenoten/Akkorde und URL-Seed. Tempo aus F2 entfernt; neue/zurückgesetzte Felder links, gespeicherte Positionen erhalten.',
      'Leistungsproblem bei der Anzeige von Haltenoten behoben. Namen und ungefähre Sichtbereiche aus Community-Dokumentation zu RESPECT V, keine genaue Zeit-/Renderkopie. Sieben gerade Spuren sind Orvio-eigen; andere Effekte werden nicht beansprucht.',
    ],
    '0.2.2': [
      'Separate 5/7-Tastenreihen, fortlaufende Eingabe und automatischer Wechsel, Doppel-/Wiederholschutz und Esc-Abbruch. Kopierknöpfe für Chart/Auswahl entfernt, URL und Verlauf behalten. Vollbildanforderung im ersten Klick/Enter und Erhalt beim Wechsel zur Auswahl; Ablehnung/Nichtunterstützung blockiert das Spiel nicht.',
    ],
    '0.2.1': [
      'Ganzzahlige Spurbreiten verhindern Abschneiden am rechten Rand beim Skalieren. Kurzer eigener Effekt statt hoher Lichtstrahlen, keine MAX100-Blitze über das ganze Feld. Fehlerhafte Haltenoten behalten gedimmte Reste ohne Wiedereinstieg oder Punkteänderung.',
    ],
    '0.2.0': [
      'Haltenotenköpfe bleiben auf der Wertungslinie, Körper bis zum Loslassen sichtbar. Automatische Synchronisierung mit hörbarer Ausgabe ersetzt manuelle Kalibrierung, ignoriert alte Offsets und berücksichtigt verspätete Ereignisse.',
      'Titelauswahlkonsole, goldene perfekte/rote Fehlwertungen und lokale Effekte, Vorschau, Tastaturmenüs und Pause/Einstellungen/Fortsetzen. Fünf gespeicherte Sprachen. Start-/Auswahlseiten und sichere Chart-URLs bei Neu-Laden/Verlauf, mit Hauptseite und altem Spiegel.',
    ],
    '0.1.0': [
      'Erste Tastaturversion mit drei eigenen Synth-Titeln und 18 leichten/normalen/schweren Charts für 5/7 Spuren samt Haltenoten. Tasten, Position, manuelle Kalibrierung (später entfernt), Wertung, Genauigkeit, Kombo und Ergebnis.',
      'Einstellungen werden auf dem Gerät gespeichert; mobil nur zum Durchsehen. Genaue DJMAX-Zeiten, Haltegewichtung und Rundung sind Näherungen. FPS geräteabhängig; kein Mehrspieler, keine gespeicherte Rangliste oder Desktop-App.',
    ],
  },
  pt: {
    '0.2.14': [
      'O campo de jogo é preparado durante o carregamento da música para reduzir a pausa do primeiro quadro no início do jogo e das repetições. Os tempos da música e das teclas, os mapas, os julgamentos e a pontuação não mudam.',
    ],
    '0.2.13': [
      'Partilhar copia um link curto sem janela de verificação nem mensagem de espera. Os links abrem diretamente o resultado com uma prévia própria.',
      'Removido o rasto translúcido das notas rápidas, sem alterar velocidade, mapas ou avaliações. Notas da versão mais claras, com seleção e cópia de texto e fontes locais atualizadas.',
    ],
    '0.2.12': [
      'Opções por ícones, efeitos BLINK/FOG/PIXEL/BLIND aproximados e fundo de música também no jogo e em cada visita. A animação da pontuação não altera a pontuação real nem os julgamentos.',
      'Escape mantém o ecrã inteiro com Keyboard Lock autorizado. Sem suporte ou permissão, o navegador pode sair. Seleção e arrasto de texto bloqueados no jogo, incluindo diálogos; notas noutro separador.',
      'Replays ausentes ou danificados ficam marcados como indisponíveis. Apenas Partilhar envia o resultado e replay para criar uma ligação curta.',
    ],
    '0.2.11': [
      'Ícones de opções, cores de julgamentos, imagem original, gênero, BPM e quantidade de notas no resultado. Prévia e parada também em resultados compartilhados; finais de notas longas são julgamentos.',
      'Gravação no dispositivo de entradas reais, tempos de áudio, pausas e efeitos. A ligação partilhada reproduz a mesma partida no mesmo motor, com os mesmos julgamentos, pontuação e combo. As gravações ficam no dispositivo; ligações antigas não têm replay.',
      'O primeiro Escape apenas sai da tela cheia. Segurar a tecla não fecha o resultado; um novo toque volta à seleção.',
      'Sem aviso Escape duplicado nem moldura automática ao abrir o resultado; foco Tab visível. Botões completos e margem inferior acessíveis em telas baixas.',
    ],
    '0.2.10': [
      'Instalável como app de computador (PWA) e app local offline. Suporte depende do navegador; atualização espera fechar janelas antigas.',
      'A música preparada fica guardada no dispositivo: em novas visitas ou offline, a música começa sem a espera anterior. Se os dados forem apagados ou faltar espaço, a música é preparada de novo.',
      'Todos os seletores usam um menu personalizado com teclado. Histórico em 13 idiomas dividido entre funcionalidades/melhorias e correções.',
    ],
    '0.2.9': [
      'Notas rápidas deixam de mostrar rastos duplicados e aparecem como uma só cabeça nítida. Notas longas, pausa e baixa velocidade sem mudanças.',
      'Resultado com música, teclas, dificuldade e opções registadas. Repetir o link restaura o mapa e as opções, não o início. Texto duplicado removido.',
      'Ajustes compactos em paisagem baixa. Limites de avaliação iguais.',
    ],
    '0.2.8': [
      'Mesmo ecrã de resultados após jogar e abrir o link. Rótulos maiores, sem campo de link, texto de privacidade ou dados de desempenho. Aviso de cópia acima do diálogo.',
      'Definições sem rolagem, com separadores em ecrãs estreitos e baixos. Fundo anterior oculto até a nova imagem estar pronta.',
      'As ligações de resultados abrem diretamente no navegador e as antigas continuam funcionando. Imagem mais fluida sem mudar notas, velocidade ou avaliação.',
    ],
    '0.2.7': [
      'Adicionados francês, alemão, português, italiano, russo, indonésio, turco e vietnamita: 13 idiomas para menus, configurações, resultados e todo o histórico de versões.',
      'Detecção do navegador, escolha manual, fontes locais e layouts ampliados. Títulos das músicas e nomes técnicos dos efeitos permanecem iguais.',
    ],
    '0.2.6': [
      'Velocidade por seletor de 0,5 em 0,5, sem barra deslizante. Padrão/reset 1,5; valores anteriores exatos identificados até a troca. Idioma do navegador por padrão, seleção manual e inglês como alternativa.',
      'Três ícones originais sob as pistas mostram velocidade, ordem e visibilidade. Número de velocidade maior, estados inativos discretos e ajuda no foco/cursor. F3 e mudanças em pausa mantidos.',
      'Ícone de compartilhar copia na hora. A URL do resultado é a de compartilhamento, também visível para cópia manual. Alterar a URL não envia dados; abri-la mostra os mesmos valores. Texto mais nítido nas imagens compartilhadas, links novos v2 e antigos v1 preservados.',
      'Miniaturas esquerda/centro/direita, símbolos reais de teclas, botões de captura fixos e instrução separada evitam saltos. Histórico web nos cinco idiomas daquela versão, acessível pelo início/seleção sem cabeçalho no jogo. Notas rápidas mais nítidas.',
    ],
    '0.2.5': [
      'Compartilhamento explícito de pontuação, precisão e combo máximo como link com cartão de prévia. Sem identidade, hora ou dados do dispositivo. Resultados locais, sem ranking; nada enviado antes de Compartilhar.',
      'Três fundos originais e títulos durante a carga. Proteção de entrada/foco durante a preparação e foco de teclado em Voltar nos resultados.',
    ],
    '0.2.4': [
      'Valores de velocidade/ordem/visibilidade em jogo por clique/F3, pausando áudio e pontuação. Velocidade/visibilidade preservam notas longas, mapa e pontos. Mudar ordem exige reinício confirmado; cancelar mantém o mapa. Corrigidos o fechamento atrasado de diálogos e as instruções.',
    ],
    '0.2.3': [
      'Opções F3 separadas: velocidade 1,0–9,0 em 0,1, FADE IN/IN2/OUT/OUT2, MIRROR e RANDOM com semente. Permutação completa preserva notas longas/acordes e semente na URL. Velocidade sai de F2; campos novos/resetados à esquerda, posições salvas mantidas.',
      'Corrigida a lentidão ao mostrar notas longas. Nomes e áreas aproximadas baseados na documentação comunitária RESPECT V, não cópia exata de tempo/renderização. Sete pistas retas são próprias do Orvio; outros efeitos não são alegados.',
    ],
    '0.2.2': [
      'Linhas de 5/7 teclas independentes, captura seguida, avanço automático, rejeição de duplicatas/repetições e Esc para cancelar. Removidos botões de copiar mapa/seleção, mantendo URL e histórico. Tela cheia solicitada no clique/Enter inicial e preservada na seleção; recusa ou falta de suporte não bloqueia jogar.',
    ],
    '0.2.1': [
      'Pistas em pixels inteiros evitam recorte à direita ao redimensionar. Efeito curto original substitui feixes altos e remove flashes MAX100 de campo inteiro. Notas longas falhadas mantêm o restante atenuado, sem reentrada ou mudança na pontuação.',
    ],
    '0.2.0': [
      'Cabeças de notas longas ficam na linha e corpos visíveis até soltar. Sincronia automática da saída audível substitui calibração manual, ignora ajustes antigos e considera eventos atrasados.',
      'Console de seleção, perfeitos dourados/falhas vermelhas/efeitos por pista, prévia, menus de teclado e pausa/configuração/retorno. Cinco idiomas salvos. Páginas de início/seleção e URLs por mapa seguras para recarga/histórico, com site principal e espelho antigo.',
    ],
    '0.1.0': [
      'Primeira versão de teclado com três músicas synth originais, 18 mapas fácil/normal/difícil para 5/7 pistas com notas longas. Teclas, posição, calibração manual (depois removida), julgamento, precisão, combo e resultado.',
      'Configurações salvas no dispositivo; celular apenas para explorar. Tempos, pesos de notas longas e arredondamento DJMAX são aproximações. FPS depende do dispositivo; sem multiplayer, ranking persistente ou aplicativo desktop.',
    ],
  },
  it: {
    '0.2.14': [
      "Il campo di gioco viene preparato durante il caricamento del brano per ridurre la pausa del primo fotogramma all'inizio del gioco e dei replay. Tempi della musica e dei tasti, mappe, giudizi e punteggi restano invariati.",
    ],
    '0.2.13': [
      'Condividi copia un link breve senza finestra di verifica o messaggio di attesa. I link aprono direttamente il risultato con una propria anteprima.',
      'Rimossa la scia traslucida delle note veloci, senza modificare velocità, tracciati o giudizi. Note di versione più chiare, testo selezionabile e copiabile e caratteri locali aggiornati.',
    ],
    '0.2.12': [
      'Opzioni a icone, effetti BLINK/FOG/PIXEL/BLIND approssimati e sfondo del brano anche durante il gioco e a ogni visita. Animazione del punteggio senza cambiare punteggio reale né giudizi.',
      'Escape breve mantiene lo schermo intero con Keyboard Lock consentito. Senza supporto o permesso il browser può uscire. Selezione e trascinamento del testo bloccati nel gioco, dialoghi inclusi; note in una nuova scheda.',
      'I replay mancanti o danneggiati restano segnalati come non disponibili. Solo Condividi invia risultato e replay per creare un link breve.',
    ],
    '0.2.11': [
      'Icone delle opzioni, colori dei giudizi, sfondo originale, genere, BPM e numero di note nel risultato. Anteprima e arresto anche nei risultati condivisi; le code delle note lunghe restano giudizi.',
      'Registrazione sul dispositivo di pressioni reali, tempi audio, pause ed effetti. Il link condiviso ripropone la stessa partita nello stesso motore, con gli stessi giudizi, punteggio e combo. Le registrazioni restano sul dispositivo; i vecchi link non hanno replay.',
      'Il primo Escape esce solo dallo schermo intero. Tenere premuto non chiude il risultato; un nuovo tocco torna alla selezione.',
      'Rimosso il suggerimento Escape doppio e il bordo automatico dei pulsanti; il focus Tab resta visibile. Pulsanti completi e margine inferiore accessibili su schermi bassi.',
    ],
    '0.2.10': [
      'Installabile come app desktop (PWA) e app locale offline. Supporto secondo browser; aggiornamento dopo la chiusura delle vecchie finestre.',
      'La musica preparata resta sul dispositivo: alle visite successive o offline il brano parte senza la vecchia attesa. Se i dati vengono cancellati o manca spazio, la musica viene preparata di nuovo.',
      'Tutti i menu a discesa usano lo stesso componente da tastiera. Cronologia in 13 lingue divisa fra funzioni/migliorie e correzioni.',
    ],
    '0.2.9': [
      'Le note veloci non lasciano più tracce doppie e mostrano una sola testa nitida. Note lunghe, pausa e bassa velocità invariate.',
      'Risultato con brano, tasti, difficoltà e opzioni registrate. Rigiocare dal link ripristina mappa e opzioni invece della home. Testo duplicato rimosso.',
      'Impostazioni compatte in orizzontale basso. Soglie invariate.',
    ],
    '0.2.8': [
      'Stessa schermata risultati dopo il gioco e dal link condiviso. Etichette più grandi, senza campo link, testo privacy o dati prestazioni. Notifica di copia sopra la finestra.',
      'Impostazioni senza scorrimento, con schede sugli schermi stretti e bassi. Sfondo precedente nascosto finché la nuova immagine non è pronta.',
      'I link dei risultati si aprono direttamente nel browser e i vecchi link continuano a funzionare. Immagine più fluida senza cambiare note, velocità o giudizi.',
    ],
    '0.2.7': [
      'Aggiunti francese, tedesco, portoghese, italiano, russo, indonesiano, turco e vietnamita: 13 lingue per menu, impostazioni, risultati e tutta la cronologia delle versioni.',
      'Rilevamento browser, scelta manuale, caratteri locali e layout estesi alle nuove lingue. Titoli dei brani e nomi tecnici degli effetti rimangono invariati.',
    ],
    '0.2.6': [
      'Velocità a scelta in passi di 0,5, senza cursore. Valore iniziale/ripristinato 1,5; valori precedenti esatti segnalati fino alla modifica. Lingua del browser predefinita, scelta manuale e inglese in assenza di corrispondenza.',
      'Tre icone originali sotto le corsie per velocità, ordine e visibilità. Velocità più grande, stati inattivi attenuati e descrizioni al passaggio/focus. Restano F3 e modifiche in pausa.',
      'Icona Condividi con copia immediata. URL del risultato uguale al link condiviso e visibile per copia manuale. Cambiare URL non invia dati; aprirlo mostra gli stessi valori. Testo più nitido nelle immagini condivise, nuovi link v2 e supporto v1.',
      'Miniature sinistra/centro/destra, simboli reali dei tasti, pulsanti fissi e istruzione separata evitano spostamenti. Cronologia web nelle cinque lingue di quella versione da inizio/selezione, senza intestazione durante il gioco. Note veloci più nitide.',
    ],
    '0.2.5': [
      'Condivisione esplicita di punteggio, precisione e combo massimo come link con scheda di anteprima. Senza identità, orari o dati del dispositivo. Risultati locali, non classifiche; nulla viene inviato prima di Condividi.',
      'Tre sfondi originali e titoli durante il caricamento. Protezione di input/focus durante la preparazione e focus tastiera su Indietro nei risultati.',
    ],
    '0.2.4': [
      'Valori velocità/ordine/visibilità durante il gioco con clic/F3, che sospende audio e punteggio. Velocità/visibilità senza sostituire note, note lunghe o punti. Ordine nuovo solo con riavvio esplicito; Annulla conserva il tracciato. Corretti chiusura ritardata dei dialoghi e istruzioni.',
    ],
    '0.2.3': [
      'Opzioni F3 separate: velocità 1,0–9,0 per 0,1, FADE IN/IN2/OUT/OUT2, MIRROR e RANDOM con seme. Permutazione biunivoca conserva note lunghe/accordi e seme URL. Velocità rimossa da F2; campi nuovi/ripristinati a sinistra, posizioni salvate conservate.',
      'Corretta la lentezza nella visualizzazione delle note lunghe. Nomi e regioni approssimative dalla documentazione della comunità RESPECT V, non equivalenza esatta di tempi/rendering. Sette corsie dritte proprie di Orvio, nessuna pretesa di altri effetti.',
    ],
    '0.2.2': [
      'Righe indipendenti a 5/7 tasti, acquisizione consecutiva e avanzamento automatico, controlli duplicati/ripetizioni e annullamento con Esc. Rimossi pulsanti di copia tracciato/selezione, mantenendo URL/storia. Schermo intero nel clic/Invio iniziale e mantenuto nella selezione; rifiuto o assenza non blocca il gioco.',
    ],
    '0.2.1': [
      'Corsie a pixel interi evitano il taglio a destra al ridimensionamento. Effetto breve originale al posto dei fasci alti, rimossi flash MAX100 su tutto il campo. Note lunghe fallite con resto attenuato, senza ripresa o cambiamenti al punteggio.',
    ],
    '0.2.0': [
      'Teste delle note lunghe sulla linea e corpi visibili fino al rilascio. Sincronizzazione automatica con uscita udibile al posto della calibrazione manuale, ignora offset precedenti e considera eventi in ritardo.',
      'Console brani, perfetti dorati/errori rossi/effetti locali graduati, anteprima audio, menu tastiera e pausa/impostazioni/riprendi. Cinque lingue salvate. Pagine iniziale/selezione e URL per tracciato sicuri per ricarica/storia, con sito principale e vecchio specchio.',
    ],
    '0.1.0': [
      'Prima versione tastiera: tre brani synth originali, 18 tracciati facile/normale/difficile a 5/7 corsie con note lunghe. Tasti, posizione, calibrazione manuale (poi rimossa), giudizi, precisione, combo e risultati.',
      'Impostazioni salvate sul dispositivo; mobile solo per consultazione. Tempi, pesi delle note lunghe e arrotondamento DJMAX sono approssimazioni. FPS dipendenti dal dispositivo; senza multigiocatore, classifica persistente o app desktop.',
    ],
  },
  ru: {
    '0.2.14': [
      'Игровое поле подготавливается во время загрузки песни, чтобы уменьшить задержку первого кадра при начале игры и повтора. Синхронизация музыки и нажатий, карты, оценки и очки не изменены.',
    ],
    '0.2.13': [
      'Поделиться копирует короткую ссылку без окна проверки и сообщения об ожидании. Ссылка сразу открывает результат с отдельной карточкой предпросмотра.',
      'Убран полупрозрачный след быстрых нот. Скорость, карты и оценки не изменены. Текст истории версий стал понятнее; его можно выделять и копировать. Дополнены локальные шрифты.',
    ],
    '0.2.12': [
      'Настройки значками, приближённые эффекты BLINK/FOG/PIXEL/BLIND, фон песни также в игре и при каждом посещении. Анимация счёта не меняет счёт и оценки.',
      'Короткий Escape сохраняет полный экран при разрешённом Keyboard Lock. Без поддержки или разрешения браузер может выйти. Выделение и перетаскивание текста запрещены в игре, включая диалоги; история в новой вкладке.',
      'Отсутствующие или повреждённые повторы помечаются недоступными. Только кнопка отправки загружает результат и повтор для короткой ссылки.',
    ],
    '0.2.11': [
      'Значки настроек, цвета оценок, фон композиции, жанр, BPM и число нот в результате. Прослушивание и остановка доступны по общей ссылке; конец удержания считается оценкой, а не новой нотой.',
      'Реальные нажатия, аудиовремя, паузы и эффекты записываются на устройстве. Ссылка повторяет ту же игру в том же движке с теми же оценками, счётом и комбо. Записи остаются на устройстве; у старых ссылок нет повтора.',
      'Первый Escape только выключает полный экран. Удержание не закрывает результат; отдельное следующее нажатие возвращает к выбору.',
      'Убраны повторная подсказка Escape и автоматическая рамка кнопки; фокус Tab сохранён. Кнопки целиком и нижний отступ доступны на низких экранах.',
    ],
    '0.2.10': [
      'Устанавливаемая настольная PWA и локальная офлайн-версия. Поддержка зависит от браузера; обновление ждёт закрытия старых окон.',
      'Подготовленная музыка хранится на устройстве: при повторном визите или офлайн трек начинается без прежнего ожидания. При удалении данных или нехватке места музыка готовится заново.',
      'Все списки заменены единым клавиатурным меню. История на 13 языках разделена на функции/улучшения и исправления.',
    ],
    '0.2.9': [
      'Быстрые ноты больше не оставляют двойных следов и показывают одну чёткую головку. Удержание, пауза и низкая скорость без изменений.',
      'Результат показывает трек, клавиши, сложность и записанные настройки. Повтор из ссылки восстанавливает карту и настройки вместо главного экрана. Повтор текста убран.',
      'Компактные настройки в низком альбомном окне. Пороги оценки прежние.',
    ],
    '0.2.8': [
      'Одинаковый экран результата после игры и по ссылке. Подписи оценок увеличены; поле ссылки, текст о приватности и показатели производительности убраны. Уведомление о копировании поверх окна.',
      'Настройки без прокрутки, с вкладками на узких низких экранах. Старый фон скрыт до готовности нового.',
      'Ссылки результатов открываются прямо в браузере, старые ссылки продолжают работать. Более плавное изображение без изменения нот, скорости или оценок.',
    ],
    '0.2.7': [
      'Добавлены французский, немецкий, португальский, итальянский, русский, индонезийский, турецкий и вьетнамский: 13 языков для меню, настроек, результатов и всей истории версий.',
      'Распознавание языка браузера, ручной выбор, локальные шрифты и макеты расширены на новые языки. Названия композиций и технические имена эффектов не меняются.',
    ],
    '0.2.6': [
      'Скорость выбирается с шагом 0,5 без ползунка. Начальное/сброшенное значение 1,5; прежние точные значения явно отмечены до изменения. По умолчанию язык браузера, ручной выбор и английский при отсутствии поддержки.',
      'Три собственных значка скорости, порядка и видимости под дорожками. Крупное значение скорости, тусклые выключенные состояния и пояснения при наведении/фокусе. F3 и изменения на паузе сохранены.',
      'Значок сразу копирует ссылку. Адрес результата совпадает с адресом для отправки и виден для ручного копирования. Смена адреса не отправляет данные; открытие показывает те же значения. Более чёткий текст на общих изображениях, новые ссылки v2, старые v1 работают.',
      'Миниатюры слева/по центру/справа, символы клавиш, фиксированные кнопки и отдельная инструкция устраняют сдвиги. История сайта на пяти языках той версии доступна с главной/выбора, без заголовка в игре. Более чёткое отображение быстрых нот.',
    ],
    '0.2.5': [
      'Явная отправка счёта, точности и макс. комбо ссылкой с карточкой предпросмотра. Без личности, времени или устройства. Локальные результаты, не рейтинг; до нажатия отправки ничего не передаётся.',
      'Три собственных фона и названия при загрузке. Защита ввода/фокуса во время подготовки и фокус клавиатуры на возврате из результатов.',
    ],
    '0.2.4': [
      'Скорость/порядок/видимость во время игры через щелчок/F3 с паузой звука и оценки. Скорость/видимость не меняют карту, длинные ноты или счёт. Для порядка нужен подтверждённый перезапуск; отмена сохраняет карту. Исправлены задержка закрытия диалога и инструкции.',
    ],
    '0.2.3': [
      'Отдельные настройки F3: скорость 1,0–9,0 с шагом 0,1, FADE IN/IN2/OUT/OUT2, MIRROR и RANDOM с seed. Взаимно-однозначная перестановка сохраняет длинные ноты/аккорды и seed в URL. Скорость удалена из F2; новое/сброшенное поле слева, сохранённые положения остаются.',
      'Исправлена медленная отрисовка длинных нот. Названия и примерные области видимости по документации сообщества RESPECT V, не точная копия времени/рендера. Семь прямых дорожек собственные; другие эффекты не заявлены.',
    ],
    '0.2.2': [
      'Раздельные ряды 5/7 клавиш, последовательный ввод и автопереход, защита от дубликатов/повторов и отмена Esc. Удалены кнопки копирования карты/выбора, но URL и история сохранены. Полный экран по начальному щелчку/Enter сохраняется при выборе; отказ/отсутствие не мешает игре.',
    ],
    '0.2.1': [
      'Целочисленная ширина дорожек устраняет обрезку правого края при изменении размера. Короткий собственный эффект вместо высоких лучей, удалены полноэкранные вспышки MAX100. Неудачные длинные ноты сохраняют тусклый остаток без повторного входа и изменения счёта.',
    ],
    '0.2.0': [
      'Головки длинных нот остаются на линии, тела видны до отпускания. Автоматическая синхронизация слышимого выхода вместо ручной калибровки, старые смещения игнорируются, задержанные события учитываются.',
      'Выбор композиций, золотые идеальные/красные промахи/эффекты дорожек, предпрослушивание, клавиатурные меню и пауза/настройки/продолжение. Пять сохраняемых языков. Главная/выбор и безопасные URL карт при обновлении/истории, основной сайт и старое зеркало.',
    ],
    '0.1.0': [
      'Первая клавиатурная версия: три собственные синтезаторные композиции, 18 лёгких/нормальных/сложных карт для 5/7 дорожек с длинными нотами. Клавиши, позиция, ручная калибровка (позже удалена), оценка, точность, комбо и результаты.',
      'Настройки сохраняются на устройстве; на мобильном только просмотр. Точные значения DJMAX по времени, весу удержания и округлению приблизительны. FPS зависит от устройства; нет сетевой игры, постоянного рейтинга и настольного приложения.',
    ],
  },
  id: {
    '0.2.14': [
      'Arena disiapkan saat lagu dimuat untuk mengurangi jeda bingkai pertama ketika permainan dan replay dimulai. Waktu musik dan input, peta nada, penilaian, serta skor tidak berubah.',
    ],
    '0.2.13': [
      'Bagikan menyalin tautan hasil pendek tanpa jendela verifikasi atau pesan tunggu. Tautan langsung membuka hasil dengan kartu pratinjau khusus.',
      'Jejak transparan di belakang not cepat dihapus. Kecepatan, peta not, dan penilaian tidak berubah. Catatan versi lebih jelas, teks dapat dipilih dan disalin, serta karakter font lokal dilengkapi.',
    ],
    '0.2.12': [
      'Opsi ikon, efek BLINK/FOG/PIXEL/BLIND perkiraan, latar lagu juga saat bermain dan di setiap kunjungan. Animasi skor tidak mengubah skor asli atau penilaian.',
      'Escape singkat menjaga layar penuh jika Keyboard Lock diizinkan. Tanpa dukungan atau izin, browser dapat keluar. Pemilihan dan seret teks diblokir di dalam game, termasuk dialog; catatan di tab baru.',
      'Replay yang hilang atau rusak tetap ditandai tidak tersedia. Hanya tombol Bagikan yang mengunggah hasil dan replay untuk membuat tautan pendek.',
    ],
    '0.2.11': [
      'Ikon opsi, warna penilaian, gambar lagu asli, genre, BPM dan jumlah nada pada hasil. Pratinjau dan berhenti juga tersedia pada hasil bersama; akhir nada tahan dihitung sebagai penilaian.',
      'Masukan nyata, waktu audio, jeda dan efek direkam di perangkat. Tautan bersama memutar ulang permainan yang sama di mesin yang sama dengan penilaian, skor dan kombo yang sama. Rekaman tetap di perangkat; tautan lama tidak punya replay.',
      'Escape pertama hanya keluar layar penuh. Menahan tombol tidak menutup hasil; tekanan baru kembali ke pilihan lagu.',
      'Petunjuk Escape ganda dan bingkai tombol otomatis dihapus; fokus Tab tetap terlihat. Tombol utuh dan jarak bawah dapat dijangkau pada layar pendek.',
    ],
    '0.2.10': [
      'Dapat dipasang sebagai aplikasi desktop (PWA) dan aplikasi lokal offline. Dukungan bergantung browser; pembaruan menunggu jendela lama ditutup.',
      'Musik yang disiapkan tersimpan di perangkat: kunjungan ulang atau offline memulai lagu tanpa menunggu seperti dulu. Jika data terhapus atau ruang habis, musik disiapkan ulang.',
      'Semua dropdown memakai menu kustom seragam dengan keyboard. Riwayat 13 bahasa dibagi menjadi fitur/peningkatan dan perbaikan.',
    ],
    '0.2.9': [
      'Not cepat tidak lagi meninggalkan jejak ganda dan tampil sebagai satu kepala tajam. Tahan, jeda dan kecepatan rendah tetap sama.',
      'Hasil menampilkan lagu, tombol, kesulitan dan opsi tercatat. Main ulang dari tautan memulihkan peta dan opsi, bukan beranda. Teks ganda dihapus.',
      'Pengaturan ringkas di layar mendatar pendek. Batas penilaian tetap.',
    ],
    '0.2.8': [
      'Layar hasil yang sama setelah bermain dan dari tautan. Label penilaian diperbesar, tanpa kolom tautan, teks privasi atau data performa. Notifikasi salin tampil di atas dialog.',
      'Pengaturan tanpa gulir, dengan tab di layar sempit dan pendek. Latar lama disembunyikan sampai gambar baru siap.',
      'Tautan hasil terbuka langsung di browser dan tautan lama tetap berfungsi. Tampilan lebih halus tanpa mengubah not, kecepatan atau penilaian.',
    ],
    '0.2.7': [
      'Menambahkan bahasa Prancis, Jerman, Portugis, Italia, Rusia, Indonesia, Turki, dan Vietnam: 13 bahasa untuk menu, pengaturan, hasil, dan seluruh riwayat versi.',
      'Deteksi bahasa browser, pilihan manual, font lokal, dan tata letak mendukung bahasa baru. Judul lagu serta nama teknis efek tetap sama.',
    ],
    '0.2.6': [
      'Kecepatan dipilih per 0,5 tanpa penggeser. Nilai awal/reset 1,5; nilai lama yang tepat diberi label sampai diubah. Bahasa mengikuti browser secara default, dengan pilihan manual dan cadangan Inggris.',
      'Tiga ikon orisinal di bawah jalur menampilkan kecepatan, susunan, dan visibilitas. Angka kecepatan lebih besar, status nonaktif redup, dan petunjuk saat disorot/fokus. F3 dan perubahan saat jeda tetap ada.',
      'Ikon berbagi langsung menyalin. Alamat hasil sama dengan tautan berbagi dan ditampilkan untuk disalin manual. Mengubah alamat tidak mengirim data; membukanya menunjukkan nilai yang sama. Teks lebih tajam pada gambar bersama; tautan baru v2, v1 tetap didukung.',
      'Miniatur kiri/tengah/kanan, simbol tombol asli, tombol input tetap dan petunjuk terpisah mencegah pergeseran. Riwayat web dalam lima bahasa saat versi ini, dari beranda/pilihan tanpa header saat bermain. Not cepat lebih tajam.',
    ],
    '0.2.5': [
      'Berbagi skor, akurasi, dan kombo maksimal secara eksplisit sebagai tautan dengan kartu pratinjau. Tanpa identitas, waktu, atau data perangkat. Hasil lokal, bukan papan peringkat; tidak dikirim sebelum Bagikan.',
      'Tiga latar lagu orisinal dan judul saat memuat. Perlindungan input/fokus selama persiapan dan fokus keyboard Kembali pada hasil.',
    ],
    '0.2.4': [
      'Nilai kecepatan/susunan/visibilitas saat bermain lewat klik/F3 yang menjeda audio dan penilaian. Kecepatan/visibilitas menjaga peta, not tahan, dan skor. Susunan baru perlu mulai ulang eksplisit; batal mempertahankan peta. Perbaikan penutupan dialog terlambat dan petunjuk.',
    ],
    '0.2.3': [
      'Opsi F3 terpisah: kecepatan 1,0–9,0 per 0,1, FADE IN/IN2/OUT/OUT2, MIRROR dan RANDOM dengan seed. Permutasi satu-ke-satu mempertahankan not tahan/akor dan seed URL. Kecepatan keluar dari F2; area baru/reset di kiri, posisi tersimpan tetap.',
      'Perbaikan lambatnya tampilan not tahan. Nama dan area perkiraan merujuk dokumentasi komunitas RESPECT V, bukan salinan waktu/render persis. Tujuh jalur lurus khusus Orvio; efek lain tidak diklaim.',
    ],
    '0.2.2': [
      'Baris 5/7 tombol terpisah, input berurutan dan pindah otomatis, pemeriksaan duplikat/pengulangan dan Esc untuk batal. Tombol salin peta/pilihan dihapus, URL/riwayat tetap ada. Layar penuh diminta saat klik/Enter awal dan bertahan di pilihan; ditolak/tidak didukung tidak menghalangi bermain.',
    ],
    '0.2.1': [
      'Lebar jalur piksel bulat mencegah sisi kanan terpotong saat ubah ukuran. Efek pendek orisinal mengganti sinar tinggi, kilatan seluruh area MAX100 dihapus. Not tahan gagal tetap menampilkan sisa redup tanpa masuk ulang atau mengubah skor.',
    ],
    '0.2.0': [
      'Kepala not tahan tetap di garis, badan terlihat sampai dilepas. Sinkronisasi output terdengar otomatis menggantikan kalibrasi manual, mengabaikan offset lama dan memperhitungkan input terlambat.',
      'Konsol lagu, sempurna emas/gagal merah/efek per jalur, pratinjau audio, menu keyboard dan jeda/pengaturan/lanjut. Lima bahasa tersimpan. Beranda/pilihan dan URL peta aman untuk muat ulang/riwayat, dengan situs utama dan cermin lama.',
    ],
    '0.1.0': [
      'Versi keyboard pertama: tiga lagu synth orisinal, 18 peta mudah/normal/sulit di 5/7 jalur dengan not tahan. Tombol, posisi, kalibrasi manual (kemudian dihapus), penilaian, akurasi, kombo, dan hasil.',
      'Pengaturan tersimpan di perangkat; ponsel hanya untuk menjelajah. Waktu, bobot not tahan, dan pembulatan DJMAX bersifat perkiraan. FPS tergantung perangkat; tanpa multipemain, peringkat tersimpan, atau aplikasi desktop.',
    ],
  },
  tr: {
    '0.2.14': [
      'Oyun ve tekrarların başlangıcındaki ilk kare takılmasını azaltmak için oyun alanı şarkı yüklenirken hazırlanır. Müzik ve tuş zamanlaması, nota düzeni, değerlendirmeler ve puanlar değişmez.',
    ],
    '0.2.13': [
      'Paylaş, doğrulama penceresi veya bekleme mesajı olmadan kısa sonuç bağlantısını kopyalar. Bağlantı doğrudan sonucu açar ve özel önizleme kartı gösterir.',
      'Hızlı notaların arkasındaki yarı saydam iz kaldırıldı. Hız, nota haritaları ve değerlendirme değişmedi. Sürüm notları daha anlaşılır; metin seçilip kopyalanabilir ve yerel yazı tipleri tamamlandı.',
    ],
    '0.2.12': [
      'Simge seçenekleri, yaklaşık BLINK/FOG/PIXEL/BLIND efektleri, şarkı arka planı oyun sırasında ve her ziyarette. Puan animasyonu gerçek puanı veya değerlendirmeyi değiştirmez.',
      'Keyboard Lock izniyle kısa Escape tam ekranı korur. Destek veya izin yoksa tarayıcı çıkabilir. Oyunda metin seçimi ve sürükleme engellenir, diyaloglar dahil; notlar yeni sekmede açılır.',
      'Eksik veya bozuk tekrarlar kullanılamaz olarak işaretlenir. Yalnızca Paylaş düğmesi sonucu ve tekrarı kısa bağlantı oluşturmak için yükler.',
    ],
    '0.2.11': [
      'Sonuçta seçenek simgeleri, değerlendirme renkleri, özgün şarkı görseli, tür, BPM ve nota sayısı. Paylaşılan sonuçlarda da ön dinleme ve durdurma; tutma sonları ayrı nota değil değerlendirmedir.',
      'Gerçek tuş basımları, ses zamanları, duraklamalar ve efektler cihazda kaydedilir. Paylaşılan bağlantı aynı oyunu aynı motorla aynı değerlendirme, puan ve komboyla tekrar oynatır. Kayıtlar cihazda kalır; eski bağlantılarda tekrar yok.',
      'İlk Escape yalnız tam ekrandan çıkar. Basılı tutmak sonucu kapatmaz; sonraki ayrı basış şarkı seçimine döner.',
      'Yinelenen Escape ipucu ve otomatik düğme çerçevesi kaldırıldı; Tab odağı görünür kalır. Kısa ekranlarda tüm düğmeler ve alt boşluk erişilebilir.',
    ],
    '0.2.10': [
      'Masaüstüne kurulabilen PWA ve yerel çevrimdışı uygulama. Destek tarayıcıya bağlıdır; güncelleme eski pencerelerin kapanmasını bekler.',
      'Hazırlanan müzik cihazda saklanır: sonraki ziyaretlerde veya çevrimdışıyken şarkı eski bekleme olmadan başlar. Veriler silinir veya yer kalmazsa müzik yeniden hazırlanır.',
      'Tüm açılır listeler ortak klavye destekli menü oldu. 13 dilde tüm geçmiş özellikler/iyileştirmeler ve hata düzeltmeleri olarak ayrıldı.',
    ],
    '0.2.9': [
      'Hızlı notalar artık çift iz bırakmaz ve tek keskin başla görünür. Basılı nota, duraklama ve düşük hız değişmez.',
      'Sonuçta parça, tuş, zorluk ve kaydedilen seçenekler gösterilir. Bağlantıdan tekrar oyun harita ve seçenekleri geri getirir, ana sayfayı değil. Yinelenen metin kaldırıldı.',
      'Kısa yatay ayarlar sıkılaştırıldı. Değerlendirme eşikleri aynı.',
    ],
    '0.2.8': [
      'Oyun sonu ve paylaşılan bağlantıda aynı sonuç ekranı. Daha büyük değerlendirme yazıları; bağlantı alanı, gizlilik metni ve performans verileri kaldırıldı. Kopyalama bildirimi pencerenin üzerinde.',
      'Ayarlar kaydırmasız; dar ve kısa ekranlarda sekmeler var. Yeni görüntü hazır olana kadar eski arka plan gizlenir.',
      'Sonuç bağlantıları doğrudan tarayıcıda açılır, eski bağlantılar çalışmaya devam eder. Notaları, hızı veya değerlendirmeyi değiştirmeden daha akıcı görüntü.',
    ],
    '0.2.7': [
      'Fransızca, Almanca, Portekizce, İtalyanca, Rusça, Endonezce, Türkçe ve Vietnamca eklendi: menüler, ayarlar, sonuçlar ve tüm sürüm geçmişi için 13 dil.',
      'Tarayıcı algılama, elle seçim, yerel yazı tipleri ve düzenler yeni dillere genişletildi. Şarkı adları ve teknik efekt adları değişmez.',
    ],
    '0.2.6': [
      'Hız, kaydırıcı yerine 0,5 adımlı seçimle ayarlanır. İlk/sıfırlama değeri 1,5; eski kesin değerler değiştirilene kadar işaretli kalır. Varsayılan tarayıcı dili, elle seçim ve İngilizce yedek dil.',
      'Şeritlerin altında hız, sıra ve görünürlük için üç özgün simge. Büyük hız sayısı, soluk kapalı durumlar ve fare/klavye odağında açıklamalar. F3 ve duraklatılmış değişiklikler korunur.',
      'Paylaş simgesi hemen kopyalar. Sonuç adresi paylaşım adresidir; elle kopyalamak için de gösterilir. Adres değişikliği veri göndermez; açılan bağlantı aynı değerleri gösterir. Paylaşılan görüntülerde daha net metin; yeni v2 bağlantıları, eski v1 desteği.',
      'Sol/orta/sağ küçük düzenler, gerçek tuş simgeleri, sabit giriş düğmeleri ve ayrı açıklama kaymayı önler. O sürümün beş dilindeki web geçmişine ana/şarkı seçiminden erişilir, oyun başlığı eklenmez. Hızlı notalar daha net görünür.',
    ],
    '0.2.5': [
      'Puan, doğruluk ve en yüksek kombo açıkça önizleme kartlı bağlantıyla paylaşılır. Kimlik, zaman ya da cihaz verisi yok. Yerel sonuç; sıralama değil. Paylaş öncesi gönderilmez.',
      'Yüklemede üç özgün şarkı arka planı ve adları. Hazırlık sırasında giriş/odak koruması ve sonuçlarda Geri klavye odağı.',
    ],
    '0.2.4': [
      'Oyun içi hız/sıra/görünürlük değerlerine tık/F3 erişimi sesi ve puanı duraklatır. Hız/görünürlük notaları, uzun notaları veya puanı değiştirmez. Sıra değişikliği açık yeniden başlatma ister; iptal haritayı korur. Gecikmiş pencere kapanışı ve yönergeler düzeltildi.',
    ],
    '0.2.3': [
      'Ayrı F3 seçenekleri: 0,1 adımla 1,0–9,0 hız, FADE IN/IN2/OUT/OUT2, MIRROR ve tohumlu RANDOM. Birebir şerit sırası uzun notaları/akorları ve URL tohumunu korur. Hız F2 dışına taşındı; yeni/sıfır alan solda, kayıtlı konum korunur.',
      'Uzun nota gösterimindeki yavaşlama düzeltildi. Adlar ve yaklaşık görünürlük alanları RESPECT V topluluk belgelerine dayanır, birebir zaman/çizim kopyası değildir. Yedi düz şerit Orvio özeldir; başka efekt iddiası yok.',
    ],
    '0.2.2': [
      'Ayrı 5/7 tuş satırları, ardışık giriş ve otomatik ilerleme, yinelenen/tekrar kontrolü ve Esc iptali. Harita/seçim kopya düğmeleri kaldırıldı, URL/geçmiş korundu. İlk tık/Enter ile tam ekran istenir ve seçime geçerken korunur; ret/desteksizlik oyunu engellemez.',
    ],
    '0.2.1': [
      'Tam piksel şerit genişlikleri boyut değişiminde sağ kenar kesilmesini önler. Uzun ışınlar yerine kısa özgün efekt, tüm alan MAX100 flaşları kaldırıldı. Kaçan uzun notalarda soluk kalan bölüm korunur, yeniden giriş veya puan değişikliği yok.',
    ],
    '0.2.0': [
      'Uzun nota başları çizgide, gövdeler bırakılana kadar görünür. Duyulan çıkışa otomatik eşitleme elle kalibrasyonun yerini alır, eski ofsetleri yok sayar ve gecikmiş girişleri hesaba katar.',
      'Şarkı konsolu, altın kusursuz/kırmızı kaçırma/kademeli şerit efektleri, önizleme, klavye menüleri ve duraklat/ayar/devam. Beş kayıtlı dil. Yenileme/geçmiş güvenli ana/seçim sayfaları ve harita URL’leri, ana site ve eski ayna.',
    ],
    '0.1.0': [
      'İlk klavye sürümü: üç özgün sentez şarkısı, uzun notalı 5/7 şeritte 18 kolay/normal/zor harita. Tuşlar, konum, elle kalibrasyon (sonra kaldırıldı), değerlendirme, doğruluk, kombo ve sonuçlar.',
      'Ayarlar cihazda saklanır; mobil yalnız göz atma. Kesin DJMAX zaman/ağırlık/yuvarlama değerleri yaklaşıktır. FPS cihaza bağlı; çok oyunculu, kalıcı sıralama veya masaüstü uygulaması yok.',
    ],
  },
  vi: {
    '0.2.14': [
      'Chuẩn bị sân chơi trong màn hình tải bài hát để giảm khựng ở khung hình đầu khi bắt đầu chơi và xem lại. Thời điểm nhạc và phím bấm, bản nốt, đánh giá và điểm số không đổi.',
    ],
    '0.2.13': [
      'Chia sẻ sao chép liên kết kết quả ngắn mà không hiện cửa sổ xác minh hay thông báo chờ. Liên kết mở thẳng kết quả và có thẻ xem trước riêng.',
      'Bỏ vệt mờ sau các nốt nhanh. Tốc độ, bản nốt và đánh giá không đổi. Ghi chú phiên bản dễ đọc hơn, có thể chọn và sao chép văn bản, đồng thời bổ sung ký tự phông chữ cục bộ.',
    ],
    '0.2.12': [
      'Tùy chọn biểu tượng, hiệu ứng BLINK/FOG/PIXEL/BLIND gần đúng, hình nền bài hát cả khi chơi và mỗi lần truy cập. Hoạt ảnh điểm không đổi điểm thật hay phán định.',
      'Escape ngắn giữ toàn màn hình khi được phép Keyboard Lock. Thiếu hỗ trợ hoặc quyền, trình duyệt vẫn có thể thoát. Chặn chọn và kéo văn bản trong game, kể cả hộp thoại; ghi chú mở tab mới.',
      'Bản phát lại thiếu hoặc hỏng vẫn được đánh dấu không khả dụng. Chỉ nút Chia sẻ mới gửi kết quả và bản phát lại để tạo liên kết ngắn.',
    ],
    '0.2.11': [
      'Biểu tượng tùy chọn, màu chấm điểm, hình nền gốc, thể loại, BPM và số nốt ở kết quả. Có thể nghe thử và dừng ở kết quả chia sẻ; cuối nốt giữ là lượt chấm, không phải nốt mới.',
      'Ghi trên thiết bị thao tác nhấn thật, thời gian âm thanh, tạm dừng và hiệu ứng. Liên kết chia sẻ phát lại cùng lượt chơi trong cùng bộ máy với cùng lượt chấm, điểm và chuỗi. Bản ghi nằm trên thiết bị; liên kết cũ không có bản phát lại.',
      'Escape đầu chỉ thoát toàn màn hình. Giữ phím không đóng kết quả; lần nhấn riêng tiếp theo trở về chọn bài.',
      'Bỏ gợi ý Escape trùng và viền nút tự động khi mở kết quả; vẫn giữ tiêu điểm Tab. Màn hình thấp vẫn truy cập được nút đầy đủ và khoảng trống dưới.',
    ],
    '0.2.10': [
      'Cài được như ứng dụng máy tính (PWA) và ứng dụng cục bộ ngoại tuyến. Hỗ trợ tùy trình duyệt; cập nhật chờ đóng cửa sổ cũ.',
      'Nhạc đã chuẩn bị được lưu trên thiết bị: lần sau hoặc khi ngoại tuyến, bài hát bắt đầu mà không chờ như trước. Nếu dữ liệu bị xóa hoặc hết chỗ, nhạc được chuẩn bị lại.',
      'Mọi danh sách thả xuống dùng chung menu tùy chỉnh hỗ trợ bàn phím. Toàn bộ lịch sử 13 ngôn ngữ chia thành tính năng/cải tiến và sửa lỗi.',
    ],
    '0.2.9': [
      'Nốt nhanh không còn để lại vệt trùng và hiển thị một đầu rõ nét. Giữ nốt, tạm dừng và tốc độ thấp không đổi.',
      'Kết quả có bài hát, phím, độ khó và tùy chọn đã ghi. Chơi lại từ liên kết khôi phục bản nốt và tùy chọn thay vì trang đầu. Bỏ chữ hoàn thành trùng.',
      'Cài đặt gọn hơn ở màn hình ngang thấp. Ngưỡng đánh giá không đổi.',
    ],
    '0.2.8': [
      'Cùng màn hình kết quả sau khi chơi và khi mở liên kết. Nhãn đánh giá lớn hơn; bỏ ô liên kết, giải thích riêng tư và số liệu hiệu năng. Thông báo sao chép hiện trên hộp thoại.',
      'Cài đặt không cuộn, dùng thẻ trên màn hình hẹp và thấp. Ẩn nền cũ đến khi ảnh mới sẵn sàng.',
      'Liên kết kết quả mở trực tiếp trong trình duyệt, liên kết cũ vẫn hoạt động. Hình ảnh mượt hơn mà không đổi nốt, tốc độ hay đánh giá.',
    ],
    '0.2.7': [
      'Thêm tiếng Pháp, Đức, Bồ Đào Nha, Ý, Nga, Indonesia, Thổ Nhĩ Kỳ và Việt: 13 ngôn ngữ cho menu, cài đặt, kết quả và toàn bộ lịch sử phiên bản.',
      'Mở rộng nhận diện trình duyệt, chọn thủ công, phông cục bộ và bố cục cho ngôn ngữ mới. Tên bài hát và tên kỹ thuật của hiệu ứng giữ nguyên.',
    ],
    '0.2.6': [
      'Tốc độ chọn theo bước 0,5 thay cho thanh trượt. Mặc định/đặt lại 1,5; giá trị cũ chính xác được ghi rõ đến khi đổi. Mặc định theo ngôn ngữ trình duyệt, có chọn tay và dự phòng tiếng Anh.',
      'Ba biểu tượng gốc dưới làn cho tốc độ, thứ tự và hiển thị. Số tốc độ lớn, trạng thái tắt mờ và mô tả khi trỏ/đặt tiêu điểm. Giữ F3 và thay đổi khi tạm dừng.',
      'Biểu tượng chia sẻ sao chép ngay. Địa chỉ kết quả là liên kết chia sẻ và hiện để chép tay. Đổi địa chỉ không gửi dữ liệu; mở liên kết hiện cùng giá trị. Chữ nét hơn trên ảnh chia sẻ; liên kết v2 mới, vẫn mở v1.',
      'Hình nhỏ trái/giữa/phải, ký hiệu phím thật, nút nhập cố định và hướng dẫn riêng ngăn xê dịch. Lịch sử web bằng năm ngôn ngữ lúc đó, từ trang chủ/chọn bài mà không thêm đầu trang khi chơi. Nốt nhanh hiển thị nét hơn.',
    ],
    '0.2.5': [
      'Chia sẻ rõ ràng điểm, độ chính xác và combo cao nhất qua liên kết có thẻ xem trước. Không danh tính, thời gian hay thiết bị. Kết quả cục bộ, không phải xếp hạng; không gửi trước khi Chia sẻ.',
      'Ba nền bài hát gốc và tiêu đề khi tải. Bảo vệ nhập/tiêu điểm trong lúc chuẩn bị, đặt tiêu điểm bàn phím vào Trở về ở kết quả.',
    ],
    '0.2.4': [
      'Giá trị tốc độ/thứ tự/hiển thị khi chơi qua nhấp/F3, tạm dừng âm thanh và chấm điểm. Tốc độ/hiển thị giữ bản nốt, nốt giữ và điểm. Đổi thứ tự cần xác nhận chơi lại; hủy giữ bản nốt cũ. Sửa đóng hộp thoại trễ và hướng dẫn.',
    ],
    '0.2.3': [
      'Tùy chọn F3 riêng: tốc độ 1,0–9,0 bước 0,1, FADE IN/IN2/OUT/OUT2, MIRROR và RANDOM có seed. Hoán vị một-một giữ nốt giữ/hợp âm và seed URL. Tốc độ ra khỏi F2; vùng mới/đặt lại ở trái, giữ vị trí đã lưu.',
      'Sửa hiển thị chậm của nốt giữ. Tên và vùng hiển thị gần đúng theo tài liệu cộng đồng RESPECT V, không sao chép thời gian/kết xuất chính xác. Bảy làn thẳng là riêng Orvio; không khẳng định hiệu ứng khác.',
    ],
    '0.2.2': [
      'Hàng 5/7 phím riêng, nhập liên tiếp và tự chuyển, kiểm tra trùng/lặp và Esc hủy. Bỏ nút chép bản nốt/lựa chọn nhưng giữ URL/lịch sử. Yêu cầu toàn màn hình ngay khi nhấp/Enter đầu và giữ sang chọn bài; từ chối/không hỗ trợ vẫn chơi được.',
    ],
    '0.2.1': [
      'Làn có chiều rộng pixel nguyên tránh cắt mép phải khi đổi kích thước. Hiệu ứng ngắn gốc thay tia cao, bỏ chớp MAX100 toàn vùng. Nốt giữ bị trượt còn phần đuôi mờ, không nhập lại hay đổi điểm.',
    ],
    '0.2.0': [
      'Đầu nốt giữ ở vạch, thân còn thấy đến khi thả. Đồng bộ đầu ra nghe được tự động thay cân chỉnh tay, bỏ offset cũ và tính thao tác trễ.',
      'Bảng chọn bài, hoàn hảo vàng/trượt đỏ/hiệu ứng từng làn, nghe thử, menu bàn phím và dừng/cài đặt/tiếp tục. Năm ngôn ngữ lưu lại. Trang chủ/chọn và URL bản nốt an toàn khi tải lại/lịch sử, trang chính và gương cũ.',
    ],
    '0.1.0': [
      'Phiên bản bàn phím đầu: ba bài synth gốc, 18 bản nốt dễ/thường/khó cho 5/7 làn có nốt giữ. Gán phím, vị trí, cân chỉnh tay (sau bỏ), chấm điểm, chính xác, combo và kết quả.',
      'Cài đặt lưu trên thiết bị; điện thoại chỉ xem. Thời gian, trọng số nốt giữ và làm tròn DJMAX là gần đúng. FPS tùy thiết bị; không nhiều người, xếp hạng lưu trữ hay ứng dụng máy tính.',
    ],
  },
};
