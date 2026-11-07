// Full public release history for the additional UI languages.
export const EXTRA_PATCH_LABELS = {
  fr: {
    title: 'Notes de version',
    back: 'Retour au jeu',
    scope:
      "Historique du prototype. Les règles de DJMAX sont approximatives et les performances dépendent de l'appareil. Les partitions automatiques YouTube ne sont pas encore disponibles.",
  },
  de: {
    title: 'Versionshinweise',
    back: 'Zurück zum Spiel',
    scope:
      'Änderungen am Prototyp. DJMAX-Wertungen sind angenähert und die Leistung hängt vom Gerät ab. Automatische YouTube-Charts sind noch nicht verfügbar.',
  },
  pt: {
    title: 'Notas da versão',
    back: 'Voltar ao jogo',
    scope:
      'Histórico do protótipo. Os tempos de DJMAX são aproximados e o desempenho depende do dispositivo. Mapas automáticos do YouTube ainda não estão disponíveis.',
  },
  it: {
    title: 'Note di versione',
    back: 'Torna al gioco',
    scope:
      'Cronologia del prototipo. I tempi di DJMAX sono approssimativi e le prestazioni dipendono dal dispositivo. I tracciati automatici da YouTube non sono ancora disponibili.',
  },
  ru: {
    title: 'История версий',
    back: 'Назад к игре',
    scope:
      'История прототипа. Правила DJMAX реализованы приблизительно, производительность зависит от устройства. Автоматические карты YouTube пока недоступны.',
  },
  id: {
    title: 'Catatan versi',
    back: 'Kembali ke permainan',
    scope:
      'Riwayat prototipe. Penilaian DJMAX bersifat perkiraan dan kinerja bergantung pada perangkat. Peta not YouTube otomatis belum tersedia.',
  },
  tr: {
    title: 'Sürüm notları',
    back: 'Oyuna dön',
    scope:
      'Prototip değişiklikleri. DJMAX zamanlaması yaklaşık uygulanır; performans cihaza bağlıdır. YouTube otomatik nota haritaları henüz yok.',
  },
  vi: {
    title: 'Ghi chú phiên bản',
    back: 'Trở về trò chơi',
    scope:
      'Lịch sử bản mẫu. Đánh giá DJMAX là gần đúng, hiệu năng tùy thiết bị. Chưa hỗ trợ bản nốt tự động từ YouTube.',
  },
};
export type ExtraLanguage = keyof typeof EXTRA_PATCH_LABELS;
export const EXTRA_PATCHES: Record<ExtraLanguage, Record<string, string[]>> = {
  fr: {
    '0.2.9': [
      'Les notes rapides relient seulement le trajet du cadre précédent avec une seule tête nette. Maintiens, pause et basse vitesse inchangés. La résolution du symptôme sur écran physique reste non confirmée.',
      'Résultat avec morceau, touches, difficulté et options enregistrées. Rejouer un lien restaure la partition et les options, pas l’accueil. Aucune option absente inventée pour les anciens liens. Texte doublé supprimé.',
      'Réglages compacts en paysage bas. Tests sur pixels décodés et horloge légère, seuils de jugement inchangés.',
    ],
    '0.2.8': [
      'Même écran de résultat après le jeu et via le lien partagé. Libellés agrandis, sans champ de lien, texte de confidentialité ni mesures de performance. Notification de copie visible.',
      'Réglages sans défilement, avec onglets sur les écrans étroits et courts. Ancien fond masqué jusqu’au décodage du nouveau.',
      'Résultats traités uniquement dans le navigateur via le fragment URL. Fonctions serveur et aperçus personnalisés supprimés, anciens liens compatibles. Horloge visuelle lissée et dimensions en cache sans changer notes, vitesse ni jugement. Perception rapide sur écran physique non vérifiée.',
    ],
    '0.2.7': [
      "Ajout du français, allemand, portugais, italien, russe, indonésien, turc et vietnamien : 13 langues pour les menus, réglages, résultats et tout l'historique des versions.",
      'La détection du navigateur, le choix manuel, les polices locales et les mises en page sont étendus aux nouvelles langues. Les titres de morceaux et les noms techniques des effets restent inchangés.',
    ],
    '0.2.6': [
      "La vitesse utilise un sélecteur par pas de 0,5, sans curseur. Valeur initiale/réinitialisée : 1,5. Les anciennes valeurs exactes restent signalées jusqu'au changement. Langue du navigateur par défaut, choix manuel et anglais si aucune langue ne correspond.",
      'Trois icônes originales sous les pistes indiquent vitesse, mélange et visibilité, avec valeur de vitesse plus grande, états inactifs atténués et descriptions au survol/focus. F3 et les modifications en pause restent disponibles.',
      "Partage par icône avec copie immédiate. L'adresse du résultat est le lien partagé, également affiché pour copie manuelle. Changer l'adresse ne transmet rien ; ouvrir le lien affiche les mêmes valeurs. Texte PNG lissé à sa taille finale ; nouveaux liens v2, anciens liens v1 conservés.",
      "Miniatures gauche/centre/droite, symboles réels des touches, boutons de saisie fixes et consigne séparée évitent les déplacements. Historique web complet dans les cinq langues de cette version, accessible depuis l'accueil et la sélection sans en-tête de jeu. Effacement opaque et alignement des notes sur les pixels ; perception sur écran physique non vérifiée.",
    ],
    '0.2.5': [
      'Partage explicite du score, de la précision et du combo maximal via HTML serveur et aperçu PNG 1200×630, avec métadonnées OG du site. Aucun identifiant, horodatage ou appareil. Résultats locaux non vérifiés, sans classement ; rien envoyé avant Partager dans cette version.',
      'Trois fonds de morceaux originaux et leurs titres pendant le chargement. Après décodage, affichage pendant au moins 0,9 s et préparation audio/affichage avant le chronomètre. Protection des entrées et du focus ; focus clavier sur Retour aux résultats.',
    ],
    '0.2.4': [
      'Valeurs vitesse/mélange/visibilité en jeu, accès clic/F3 qui suspend audio et score. Vitesse/visibilité sans remplacer les notes, notes tenues ou score. Mélange avec confirmation de redémarrage ; annuler conserve partition et graine. Correction de la fermeture différée des fenêtres et des instructions.',
    ],
    '0.2.3': [
      'Options F3 distinctes : vitesse 1,0–9,0 par 0,1, FADE IN/IN2/OUT/OUT2, MIRROR et RANDOM déterministe. Une permutation bijective conserve notes tenues/accords et graine URL. Vitesse retirée de F2 ; champs nouveaux/réinitialisés à gauche, positions enregistrées conservées.',
      "Masques GPU remplacés avant publication par découpage direct des notes tenues. Noms et zones approximatives d'après la documentation communautaire RESPECT V, sans équivalence exacte de rendu/temps. Les sept pistes droites sont propres à Orvio ; aucun autre effet revendiqué.",
    ],
    '0.2.2': [
      'Rangées de 5/7 touches indépendantes, saisie successive et avance automatique, détection de doublons/répétitions et annulation Échap. Suppression des boutons de copie de partition/sélection, sans supprimer URL ni historique. Démarrage plein écran dans le clic/Entrée initial et maintien vers la sélection ; refus ou absence de plein écran ne bloque pas le jeu.',
    ],
    '0.2.1': [
      'Largeurs entières pour éviter de couper le bord droit au redimensionnement. Effet court original à la place des longs faisceaux, suppression des flashs MAX100 sur tout le terrain. Les notes tenues ratées gardent une fin atténuée, sans reprise ni changement de score.',
    ],
    '0.2.0': [
      "Têtes des notes tenues sur la ligne et corps visibles jusqu'au relâchement. Synchronisation automatique avec la sortie audible, suppression du réglage manuel et des anciens décalages, prise en compte des événements retardés.",
      'Console de sélection, parfait doré/raté rouge/effets locaux gradués, extraits audio, menus clavier et pause/réglages/reprise. Cinq langues enregistrées ; accueil/sélection Astro et 18 URL de partitions sûres au rechargement/navigation. Site principal et ancien miroir, contrôles horaires, preuves de panne et procédure de restauration.',
    ],
    '0.1.0': [
      'Premier prototype clavier : trois morceaux de synthèse originaux, 18 partitions facile/normale/difficile à 5/7 pistes avec notes tenues. Touches, position, calibration manuelle (retirée ensuite), horloge audio, jugements, précision, combo et résultats.',
      "Réglages locaux, mobile réservé à la consultation, tests déterministes et navigateur, CI, licence et documentation de contribution/sécurité. Équivalence DJMAX exacte non établie ; FPS selon l'appareil. Pas de multijoueur, classement persistant ni application de bureau.",
    ],
  },
  de: {
    '0.2.9': [
      'Schnelle Noten verbinden nur die Bewegungslücke zum vorigen Bild mit einem scharfen Kopf. Halten, Pause und langsame Noten unverändert. Lösung des realen Displayproblems noch nicht bestätigt.',
      'Ergebnis zeigt Titel, Tasten, Schwierigkeit und gespeicherte Optionen. Erneutes Spielen geteilter Ergebnisse stellt Chart und Optionen wieder her statt der Startseite. Fehlende alte Werte werden nicht erfunden. Doppelter Text entfernt.',
      'Kompaktere Einstellungen im niedrigen Querformat. Tests vergleichen dekodierte Pixel und lesen eine leichte Uhr; Wertungsgrenzen bleiben gleich.',
    ],
    '0.2.8': [
      'Gleiche Ergebnisansicht nach dem Spiel und im geteilten Link. Größere Wertungsbeschriftung, kein Linkfeld, Datenschutztext oder Leistungswerte. Kopiermeldung über dem Dialog.',
      'Einstellungen ohne Scrollen, mit Tabs auf schmalen niedrigen Bildschirmen. Alter Hintergrund bleibt bis zur Dekodierung des neuen verborgen.',
      'Ergebnisse nur im Browser aus dem URL-Fragment. Serverfunktionen und persönliche Vorschauen entfernt; alte Links bleiben lesbar. Geglättete Bildzeit und zwischengespeicherte Größe ändern keine Noten, Geschwindigkeit oder Wertung. Wahrnehmung bei hoher Geschwindigkeit auf echten Displays nicht bestätigt.',
    ],
    '0.2.7': [
      'Französisch, Deutsch, Portugiesisch, Italienisch, Russisch, Indonesisch, Türkisch und Vietnamesisch ergänzt: 13 Sprachen für Menüs, Einstellungen, Ergebnisse und die vollständige Versionsgeschichte.',
      'Browsererkennung, manuelle Auswahl, lokale Schriftarten und Layouts unterstützen die neuen Sprachen. Titelnamen und technische Effektnamen bleiben unverändert.',
    ],
    '0.2.6': [
      'Tempo als Auswahl in 0,5-Schritten statt Schieberegler. Anfangs-/Rücksetzwert 1,5; alte genaue Werte bleiben bis zur Änderung gekennzeichnet. Standardmäßig Browsersprache, mit manueller Auswahl und Englisch als Ersatz.',
      'Drei eigene Symbole unter den Spuren für Tempo, Reihenfolge und Sichtbarkeit. Große Tempoanzeige, gedimmte inaktive Zustände und Hinweise bei Maus-/Tastaturfokus. F3 und Änderungen in Pause bleiben erhalten.',
      'Teilen-Symbol kopiert sofort. Die Ergebnisadresse ist die Freigabeadresse, auch zum manuellen Kopieren sichtbar. URL-Änderung sendet nichts; Öffnen zeigt dieselben Werte. PNG-Schrift mit Kantenglättung in Ausgabegröße; neue v2-Links, alte v1-Links weiterhin gültig.',
      'Miniaturen für links/Mitte/rechts, echte Tastensymbole, feste Eingabefelder und separate Hinweise verhindern Layoutsprünge. Web-Versionsgeschichte in den damaligen fünf Sprachen über Start/Auswahl, ohne Spielkopfzeile. Undurchsichtiges Löschen jedes Bildes und Pixelraster; Bewegung auf physischen Bildschirmen ungeprüft.',
    ],
    '0.2.5': [
      'Ausdrückliches Teilen von Punkten, Genauigkeit und maximaler Kombo über Server-HTML und 1200×630-PNG, dazu Standard-OG-Metadaten. Keine Identität, Zeit- oder Gerätedaten. Lokale ungeprüfte Ergebnisse, keine Rangliste; in dieser Version kein Versand vor Teilen.',
      'Drei eigene Titelhintergründe beim Laden. Nach Bilddekodierung mindestens 0,9 s sichtbar, Audio/Grafik bereit vor Start der Uhr. Eingabe-/Fokusschutz und Tastaturfokus für Zurück im Ergebnis.',
    ],
    '0.2.4': [
      'Aktuelle Tempo-/Spur-/Sichtbarkeitswerte im Spiel per Klick/F3; Optionen pausieren Audio und Wertung. Tempo/Sichtbarkeit ohne neue Noten, Haltenoten oder Punkte. Spuränderung mit bestätigtem Neustart, Abbruch erhält Chart und Seed. Verzögertes Dialogschließen und Anleitung korrigiert.',
    ],
    '0.2.3': [
      'Eigene F3-Optionen: Tempo 1,0–9,0 in 0,1-Schritten, FADE IN/IN2/OUT/OUT2, MIRROR und RANDOM mit Seed. Bijektive Spurfolge erhält Haltenoten/Akkorde und URL-Seed. Tempo aus F2 entfernt; neue/zurückgesetzte Felder links, gespeicherte Positionen erhalten.',
      'GPU-Masken vor Veröffentlichung durch direktes Beschneiden der Haltenoten ersetzt. Namen und ungefähre Sichtbereiche aus Community-Dokumentation zu RESPECT V, keine genaue Zeit-/Renderkopie. Sieben gerade Spuren sind Orvio-eigen; andere Effekte werden nicht beansprucht.',
    ],
    '0.2.2': [
      'Separate 5/7-Tastenreihen, fortlaufende Eingabe und automatischer Wechsel, Doppel-/Wiederholschutz und Esc-Abbruch. Kopierknöpfe für Chart/Auswahl entfernt, URL und Verlauf behalten. Vollbildanforderung im ersten Klick/Enter und Erhalt beim Wechsel zur Auswahl; Ablehnung/Nichtunterstützung blockiert das Spiel nicht.',
    ],
    '0.2.1': [
      'Ganzzahlige Spurbreiten verhindern Abschneiden am rechten Rand beim Skalieren. Kurzer eigener Effekt statt hoher Lichtstrahlen, keine MAX100-Blitze über das ganze Feld. Fehlerhafte Haltenoten behalten gedimmte Reste ohne Wiedereinstieg oder Punkteänderung.',
    ],
    '0.2.0': [
      'Haltenotenköpfe bleiben auf der Wertungslinie, Körper bis zum Loslassen sichtbar. Automatische Synchronisierung mit hörbarer Ausgabe ersetzt manuelle Kalibrierung, ignoriert alte Offsets und berücksichtigt verspätete Ereignisse.',
      'Titelauswahlkonsole, goldene perfekte/rote Fehlwertungen und lokale Effekte, Vorschau, Tastaturmenüs und Pause/Einstellungen/Fortsetzen. Fünf gespeicherte Sprachen. Astro-Start/Auswahl und 18 sichere Chart-URLs mit Neu-Laden/Verlauf. Hauptseite und alter Spiegel, stündliche Prüfungen, Fehlernachweise und Wiederherstellung.',
    ],
    '0.1.0': [
      'Erster Tastaturprototyp mit drei eigenen Synth-Titeln und 18 leichten/normalen/schweren Charts für 5/7 Spuren samt Haltenoten. Tasten, Position, manuelle Kalibrierung (später entfernt), Audiouhr, Wertung, Genauigkeit, Kombo und Ergebnis.',
      'Lokale Einstellungen, mobile Ansicht nur zum Durchsehen, deterministische/Browser-Tests, CI, Lizenz und Beitrags-/Sicherheitsdokumentation. Exakte DJMAX-Zeiten/Haltegewichtung/Rundung ungeprüft. FPS geräteabhängig; kein Mehrspieler, keine gespeicherte Rangliste oder Desktop-App.',
    ],
  },
  pt: {
    '0.2.9': [
      'Notas rápidas ligam apenas o intervalo até ao quadro anterior, com uma só cabeça nítida. Notas longas, pausa e baixa velocidade sem mudanças. Problema no ecrã físico ainda não confirmado como resolvido.',
      'Resultado com música, teclas, dificuldade e opções registadas. Repetir o link restaura o mapa e as opções, não o início. Links antigos não inventam valores ausentes. Texto duplicado removido.',
      'Ajustes compactos em paisagem baixa. Testes por píxeis descodificados e relógio leve; limites de avaliação iguais.',
    ],
    '0.2.8': [
      'Mesmo ecrã de resultados após jogar e abrir o link. Rótulos maiores, sem campo de link, texto de privacidade ou dados de desempenho. Aviso de cópia acima do diálogo.',
      'Definições sem rolagem, com separadores em ecrãs estreitos e baixos. Fundo anterior oculto até descodificar o novo.',
      'Resultados apenas no navegador pelo fragmento do URL. Funções de servidor e prévias pessoais removidas; links antigos compatíveis. Relógio visual suavizado e tamanho em cache sem mudar notas, velocidade ou avaliação. Perceção em alta velocidade num ecrã físico ainda não verificada.',
    ],
    '0.2.7': [
      'Adicionados francês, alemão, português, italiano, russo, indonésio, turco e vietnamita: 13 idiomas para menus, configurações, resultados e todo o histórico de versões.',
      'Detecção do navegador, escolha manual, fontes locais e layouts ampliados. Títulos das músicas e nomes técnicos dos efeitos permanecem iguais.',
    ],
    '0.2.6': [
      'Velocidade por seletor de 0,5 em 0,5, sem barra deslizante. Padrão/reset 1,5; valores anteriores exatos identificados até a troca. Idioma do navegador por padrão, seleção manual e inglês como alternativa.',
      'Três ícones originais sob as pistas mostram velocidade, ordem e visibilidade. Número de velocidade maior, estados inativos discretos e ajuda no foco/cursor. F3 e mudanças em pausa mantidos.',
      'Ícone de compartilhar copia na hora. A URL do resultado é a de compartilhamento, também visível para cópia manual. Alterar a URL não envia dados; abri-la mostra os mesmos valores. Texto PNG suavizado no tamanho final, links novos v2 e antigos v1 preservados.',
      'Miniaturas esquerda/centro/direita, símbolos reais de teclas, botões de captura fixos e instrução separada evitam saltos. Histórico web nos cinco idiomas daquela versão, acessível pelo início/seleção sem cabeçalho no jogo. Limpeza opaca dos quadros e alinhamento em pixels; movimento em telas físicas não verificado.',
    ],
    '0.2.5': [
      'Compartilhamento explícito de pontuação, precisão e combo máximo com HTML do servidor, PNG 1200×630 e metadados OG. Sem identidade, hora ou dados do dispositivo. Resultados locais não verificados, sem ranking; nada enviado antes de Compartilhar nesta versão.',
      'Três fundos originais e títulos durante a carga. Após decodificar a imagem, mostrar por pelo menos 0,9 s e preparar áudio/renderizador antes do relógio. Proteção de entrada/foco e foco de teclado em Voltar nos resultados.',
    ],
    '0.2.4': [
      'Valores de velocidade/ordem/visibilidade em jogo por clique/F3, pausando áudio e pontuação. Velocidade/visibilidade preservam notas longas, mapa e pontos. Mudar ordem exige reinício confirmado; cancelar mantém mapa/semente. Corrigida disputa no fechamento de diálogos e instruções.',
    ],
    '0.2.3': [
      'Opções F3 separadas: velocidade 1,0–9,0 em 0,1, FADE IN/IN2/OUT/OUT2, MIRROR e RANDOM com semente. Permutação completa preserva notas longas/acordes e semente na URL. Velocidade sai de F2; campos novos/resetados à esquerda, posições salvas mantidas.',
      'Máscaras GPU substituídas antes da versão por recorte direto de notas longas. Nomes e áreas aproximadas baseados na documentação comunitária RESPECT V, não cópia exata de tempo/renderização. Sete pistas retas são próprias do Orvio; outros efeitos não são alegados.',
    ],
    '0.2.2': [
      'Linhas de 5/7 teclas independentes, captura seguida, avanço automático, rejeição de duplicatas/repetições e Esc para cancelar. Removidos botões de copiar mapa/seleção, mantendo URL e histórico. Tela cheia solicitada no clique/Enter inicial e preservada na seleção; recusa ou falta de suporte não bloqueia jogar.',
    ],
    '0.2.1': [
      'Pistas em pixels inteiros evitam recorte à direita ao redimensionar. Efeito curto original substitui feixes altos e remove flashes MAX100 de campo inteiro. Notas longas falhadas mantêm o restante atenuado, sem reentrada ou mudança na pontuação.',
    ],
    '0.2.0': [
      'Cabeças de notas longas ficam na linha e corpos visíveis até soltar. Sincronia automática da saída audível substitui calibração manual, ignora ajustes antigos e considera eventos atrasados.',
      'Console de seleção, perfeitos dourados/falhas vermelhas/efeitos por pista, prévia, menus de teclado e pausa/configuração/retorno. Cinco idiomas salvos. Início/seleção Astro e 18 URLs seguras para recarga/histórico. Site principal e espelho antigo, verificações horárias, evidências de falhas e recuperação.',
    ],
    '0.1.0': [
      'Primeiro protótipo com três músicas synth originais, 18 mapas fácil/normal/difícil para 5/7 pistas com notas longas. Teclas, posição, calibração manual (depois removida), relógio de áudio, julgamento, precisão, combo e resultado.',
      'Configurações locais, orientação móvel apenas para explorar, testes deterministas/de navegador, CI, licença e documentação de contribuição/segurança. Equivalência exata de tempos/pesos/arredondamento DJMAX não estabelecida. FPS depende do dispositivo; sem multiplayer, ranking persistente ou aplicativo desktop.',
    ],
  },
  it: {
    '0.2.9': [
      'Le note veloci collegano solo il tratto dal fotogramma precedente con una sola testa nitida. Note lunghe, pausa e bassa velocità invariate. Risoluzione del problema sullo schermo fisico non confermata.',
      'Risultato con brano, tasti, difficoltà e opzioni registrate. Rigiocare dal link ripristina mappa e opzioni invece della home. Nessun valore mancante inventato nei vecchi link. Testo duplicato rimosso.',
      'Impostazioni compatte in orizzontale basso. Test sui pixel decodificati e orologio leggero; soglie invariate.',
    ],
    '0.2.8': [
      'Stessa schermata risultati dopo il gioco e dal link condiviso. Etichette più grandi, senza campo link, testo privacy o dati prestazioni. Notifica di copia sopra la finestra.',
      'Impostazioni senza scorrimento, con schede sugli schermi stretti e bassi. Sfondo precedente nascosto fino alla decodifica del nuovo.',
      'Risultati elaborati solo nel browser tramite frammento URL. Rimosse funzioni server e anteprime personali; vecchi link compatibili. Orologio visivo più stabile e dimensioni in cache senza cambiare note, velocità o giudizi. Percezione ad alta velocità su schermi fisici non verificata.',
    ],
    '0.2.7': [
      'Aggiunti francese, tedesco, portoghese, italiano, russo, indonesiano, turco e vietnamita: 13 lingue per menu, impostazioni, risultati e tutta la cronologia delle versioni.',
      'Rilevamento browser, scelta manuale, caratteri locali e layout estesi alle nuove lingue. Titoli dei brani e nomi tecnici degli effetti rimangono invariati.',
    ],
    '0.2.6': [
      'Velocità a scelta in passi di 0,5, senza cursore. Valore iniziale/ripristinato 1,5; valori precedenti esatti segnalati fino alla modifica. Lingua del browser predefinita, scelta manuale e inglese in assenza di corrispondenza.',
      'Tre icone originali sotto le corsie per velocità, ordine e visibilità. Velocità più grande, stati inattivi attenuati e descrizioni al passaggio/focus. Restano F3 e modifiche in pausa.',
      'Icona Condividi con copia immediata. URL del risultato uguale al link condiviso e visibile per copia manuale. Cambiare URL non invia dati; aprirlo mostra gli stessi valori. Testo PNG antialias alla dimensione finale, nuovi link v2 e supporto v1.',
      'Miniature sinistra/centro/destra, simboli reali dei tasti, pulsanti fissi e istruzione separata evitano spostamenti. Cronologia web nelle cinque lingue di quella versione da inizio/selezione, senza intestazione durante il gioco. Pulizia opaca dei fotogrammi e allineamento ai pixel; movimento su schermi fisici non verificato.',
    ],
    '0.2.5': [
      'Condivisione esplicita di punteggio, precisione e combo massimo con HTML server e PNG 1200×630, più metadati OG del sito. Senza identità, orari o dati del dispositivo. Risultati locali non verificati, non classifiche; in questa versione nulla viene inviato prima di Condividi.',
      'Tre sfondi originali e titoli durante il caricamento. Dopo la decodifica almeno 0,9 s visibili, audio/rendering pronti prima del timer. Protezione di input/focus e focus tastiera su Indietro nei risultati.',
    ],
    '0.2.4': [
      'Valori velocità/ordine/visibilità durante il gioco con clic/F3, che sospende audio e punteggio. Velocità/visibilità senza sostituire note, note lunghe o punti. Ordine nuovo solo con riavvio esplicito; Annulla conserva tracciato/seme. Corretti chiusura ritardata dei dialoghi e istruzioni.',
    ],
    '0.2.3': [
      'Opzioni F3 separate: velocità 1,0–9,0 per 0,1, FADE IN/IN2/OUT/OUT2, MIRROR e RANDOM con seme. Permutazione biunivoca conserva note lunghe/accordi e seme URL. Velocità rimossa da F2; campi nuovi/ripristinati a sinistra, posizioni salvate conservate.',
      'Maschere GPU sostituite prima della pubblicazione con ritaglio diretto delle note lunghe. Nomi e regioni approssimative dalla documentazione della comunità RESPECT V, non equivalenza esatta di tempi/rendering. Sette corsie dritte proprie di Orvio, nessuna pretesa di altri effetti.',
    ],
    '0.2.2': [
      'Righe indipendenti a 5/7 tasti, acquisizione consecutiva e avanzamento automatico, controlli duplicati/ripetizioni e annullamento con Esc. Rimossi pulsanti di copia tracciato/selezione, mantenendo URL/storia. Schermo intero nel clic/Invio iniziale e mantenuto nella selezione; rifiuto o assenza non blocca il gioco.',
    ],
    '0.2.1': [
      'Corsie a pixel interi evitano il taglio a destra al ridimensionamento. Effetto breve originale al posto dei fasci alti, rimossi flash MAX100 su tutto il campo. Note lunghe fallite con resto attenuato, senza ripresa o cambiamenti al punteggio.',
    ],
    '0.2.0': [
      'Teste delle note lunghe sulla linea e corpi visibili fino al rilascio. Sincronizzazione automatica con uscita udibile al posto della calibrazione manuale, ignora offset precedenti e considera eventi in ritardo.',
      'Console brani, perfetti dorati/errori rossi/effetti locali graduati, anteprima audio, menu tastiera e pausa/impostazioni/riprendi. Cinque lingue salvate. Inizio/selezione Astro e 18 URL sicuri per ricarica/storia. Sito principale/specchio, controlli orari, prove dei guasti e ripristino.',
    ],
    '0.1.0': [
      'Primo prototipo tastiera: tre brani synth originali, 18 tracciati facile/normale/difficile a 5/7 corsie con note lunghe. Tasti, posizione, calibrazione manuale (poi rimossa), orologio audio, giudizi, precisione, combo e risultati.',
      'Impostazioni locali, mobile solo consultazione, test deterministici/browser, CI, licenza e documenti di contribuzione/sicurezza. Equivalenza esatta DJMAX per tempi/pesi/arrotondamento non stabilita. FPS dipendenti dal dispositivo; senza multigiocatore, classifica persistente o app desktop.',
    ],
  },
  ru: {
    '0.2.9': [
      'Быстрые ноты соединяют только промежуток до предыдущего кадра, сохраняя одну чёткую головку. Удержание, пауза и низкая скорость без изменений. Исправление восприятия на физическом экране не подтверждено.',
      'Результат показывает трек, клавиши, сложность и записанные настройки. Повтор из ссылки восстанавливает карту и настройки вместо главного экрана. Старые отсутствующие значения не выдумываются. Повтор текста убран.',
      'Компактные настройки в низком альбомном окне. Тесты сравнивают декодированные пиксели и читают лёгкие часы; пороги оценки прежние.',
    ],
    '0.2.8': [
      'Одинаковый экран результата после игры и по ссылке. Подписи оценок увеличены; поле ссылки, текст о приватности и показатели производительности убраны. Уведомление о копировании поверх окна.',
      'Настройки без прокрутки, с вкладками на узких низких экранах. Старый фон скрыт до декодирования нового.',
      'Результаты обрабатываются только браузером из фрагмента URL. Серверные функции и личные превью удалены; старые ссылки читаются локально. Сглаживание времени отображения и кеш размеров не меняют ноты, скорость или оценку. Восприятие быстрых нот на физическом экране ещё не проверено.',
    ],
    '0.2.7': [
      'Добавлены французский, немецкий, португальский, итальянский, русский, индонезийский, турецкий и вьетнамский: 13 языков для меню, настроек, результатов и всей истории версий.',
      'Распознавание языка браузера, ручной выбор, локальные шрифты и макеты расширены на новые языки. Названия композиций и технические имена эффектов не меняются.',
    ],
    '0.2.6': [
      'Скорость выбирается с шагом 0,5 без ползунка. Начальное/сброшенное значение 1,5; прежние точные значения явно отмечены до изменения. По умолчанию язык браузера, ручной выбор и английский при отсутствии поддержки.',
      'Три собственных значка скорости, порядка и видимости под дорожками. Крупное значение скорости, тусклые выключенные состояния и пояснения при наведении/фокусе. F3 и изменения на паузе сохранены.',
      'Значок сразу копирует ссылку. Адрес результата совпадает с адресом для отправки и виден для ручного копирования. Смена адреса не отправляет данные; открытие показывает те же значения. Сглаженный текст PNG в итоговом размере, новые ссылки v2, старые v1 работают.',
      'Миниатюры слева/по центру/справа, символы клавиш, фиксированные кнопки и отдельная инструкция устраняют сдвиги. История сайта на пяти языках той версии доступна с главной/выбора, без заголовка в игре. Непрозрачная очистка кадров и привязка к пикселям; движение на физическом экране не проверено.',
    ],
    '0.2.5': [
      'Явная отправка счёта, точности и макс. комбо через серверный HTML и PNG 1200×630, плюс стандартные OG-данные. Без личности, времени или устройства. Локальные непроверенные результаты, не рейтинг; в этой версии до нажатия отправки ничего не передаётся.',
      'Три собственных фона и названия при загрузке. После декодирования показ не менее 0,9 с и подготовка звука/графики до запуска часов. Защита ввода/фокуса и фокус клавиатуры на возврате из результатов.',
    ],
    '0.2.4': [
      'Скорость/порядок/видимость во время игры через щелчок/F3 с паузой звука и оценки. Скорость/видимость не меняют карту, длинные ноты или счёт. Для порядка нужен подтверждённый перезапуск; отмена сохраняет карту и seed. Исправлены задержка закрытия диалога и инструкции.',
    ],
    '0.2.3': [
      'Отдельные настройки F3: скорость 1,0–9,0 с шагом 0,1, FADE IN/IN2/OUT/OUT2, MIRROR и RANDOM с seed. Взаимно-однозначная перестановка сохраняет длинные ноты/аккорды и seed в URL. Скорость удалена из F2; новое/сброшенное поле слева, сохранённые положения остаются.',
      'GPU-маски до выпуска заменены прямым обрезанием длинных нот. Названия и примерные области видимости по документации сообщества RESPECT V, не точная копия времени/рендера. Семь прямых дорожек собственные; другие эффекты не заявлены.',
    ],
    '0.2.2': [
      'Раздельные ряды 5/7 клавиш, последовательный ввод и автопереход, защита от дубликатов/повторов и отмена Esc. Удалены кнопки копирования карты/выбора, но URL и история сохранены. Полный экран по начальному щелчку/Enter сохраняется при выборе; отказ/отсутствие не мешает игре.',
    ],
    '0.2.1': [
      'Целочисленная ширина дорожек устраняет обрезку правого края при изменении размера. Короткий собственный эффект вместо высоких лучей, удалены полноэкранные вспышки MAX100. Неудачные длинные ноты сохраняют тусклый остаток без повторного входа и изменения счёта.',
    ],
    '0.2.0': [
      'Головки длинных нот остаются на линии, тела видны до отпускания. Автоматическая синхронизация слышимого выхода вместо ручной калибровки, старые смещения игнорируются, задержанные события учитываются.',
      'Выбор композиций, золотые идеальные/красные промахи/эффекты дорожек, предпрослушивание, клавиатурные меню и пауза/настройки/продолжение. Пять сохраняемых языков. Главная/выбор Astro и 18 безопасных URL карт с обновлением/историей. Основной сайт/зеркало, ежечасные проверки, свидетельства сбоев и восстановление.',
    ],
    '0.1.0': [
      'Первый прототип: три собственные синтезаторные композиции, 18 лёгких/нормальных/сложных карт для 5/7 дорожек с длинными нотами. Клавиши, позиция, ручная калибровка (позже удалена), аудиочасы, оценка, точность, комбо и результаты.',
      'Локальные настройки, на мобильном только просмотр, детерминированные/браузерные тесты, CI, лицензия и документация вклада/безопасности. Точное совпадение DJMAX по времени/весу/округлению не установлено. FPS зависит от устройства; нет сетевой игры, постоянного рейтинга и настольного приложения.',
    ],
  },
  id: {
    '0.2.9': [
      'Not cepat hanya menyambung celah ke bingkai sebelumnya dengan satu kepala tajam. Tahan, jeda dan kecepatan rendah tetap sama. Perbaikan gejala layar fisik belum terkonfirmasi.',
      'Hasil menampilkan lagu, tombol, kesulitan dan opsi tercatat. Main ulang dari tautan memulihkan peta dan opsi, bukan beranda. Tautan lama tidak mengarang nilai yang hilang. Teks ganda dihapus.',
      'Pengaturan ringkas di layar mendatar pendek. Uji membandingkan piksel terdekode dan jam ringan; batas penilaian tetap.',
    ],
    '0.2.8': [
      'Layar hasil yang sama setelah bermain dan dari tautan. Label penilaian diperbesar, tanpa kolom tautan, teks privasi atau data performa. Notifikasi salin tampil di atas dialog.',
      'Pengaturan tanpa gulir, dengan tab di layar sempit dan pendek. Latar lama disembunyikan sampai gambar baru selesai didekode.',
      'Hasil diproses hanya di browser dari fragmen URL. Fungsi server dan pratinjau skor pribadi dihapus; tautan lama tetap dibaca lokal. Jam visual diperhalus dan ukuran disimpan tanpa mengubah not, kecepatan atau penilaian. Persepsi not cepat di layar fisik belum terverifikasi.',
    ],
    '0.2.7': [
      'Menambahkan bahasa Prancis, Jerman, Portugis, Italia, Rusia, Indonesia, Turki, dan Vietnam: 13 bahasa untuk menu, pengaturan, hasil, dan seluruh riwayat versi.',
      'Deteksi bahasa browser, pilihan manual, font lokal, dan tata letak mendukung bahasa baru. Judul lagu serta nama teknis efek tetap sama.',
    ],
    '0.2.6': [
      'Kecepatan dipilih per 0,5 tanpa penggeser. Nilai awal/reset 1,5; nilai lama yang tepat diberi label sampai diubah. Bahasa mengikuti browser secara default, dengan pilihan manual dan cadangan Inggris.',
      'Tiga ikon orisinal di bawah jalur menampilkan kecepatan, susunan, dan visibilitas. Angka kecepatan lebih besar, status nonaktif redup, dan petunjuk saat disorot/fokus. F3 dan perubahan saat jeda tetap ada.',
      'Ikon berbagi langsung menyalin. Alamat hasil sama dengan tautan berbagi dan ditampilkan untuk disalin manual. Mengubah alamat tidak mengirim data; membukanya menunjukkan nilai yang sama. Teks PNG diperhalus pada ukuran akhir; tautan baru v2, v1 tetap didukung.',
      'Miniatur kiri/tengah/kanan, simbol tombol asli, tombol input tetap dan petunjuk terpisah mencegah pergeseran. Riwayat web dalam lima bahasa saat versi ini, dari beranda/pilihan tanpa header saat bermain. Frame dibersihkan opak dan not sejajar piksel; gerak pada layar fisik belum diverifikasi.',
    ],
    '0.2.5': [
      'Berbagi skor, akurasi, dan kombo maksimal secara eksplisit dengan HTML server dan PNG 1200×630, ditambah metadata OG situs. Tanpa identitas, waktu, atau data perangkat. Hasil lokal belum diverifikasi, bukan papan peringkat; pada versi ini tidak dikirim sebelum Bagikan.',
      'Tiga latar lagu orisinal dan judul saat memuat. Setelah gambar didekode, tampil minimal 0,9 detik dan siapkan audio/render sebelum jam dimulai. Perlindungan input/fokus dan fokus keyboard Kembali pada hasil.',
    ],
    '0.2.4': [
      'Nilai kecepatan/susunan/visibilitas saat bermain lewat klik/F3 yang menjeda audio dan penilaian. Kecepatan/visibilitas menjaga peta, not tahan, dan skor. Susunan baru perlu mulai ulang eksplisit; batal mempertahankan peta/seed. Perbaikan penutupan dialog terlambat dan petunjuk.',
    ],
    '0.2.3': [
      'Opsi F3 terpisah: kecepatan 1,0–9,0 per 0,1, FADE IN/IN2/OUT/OUT2, MIRROR dan RANDOM dengan seed. Permutasi satu-ke-satu mempertahankan not tahan/akor dan seed URL. Kecepatan keluar dari F2; area baru/reset di kiri, posisi tersimpan tetap.',
      'Mask GPU diganti sebelum rilis dengan pemotongan langsung not tahan. Nama dan area perkiraan merujuk dokumentasi komunitas RESPECT V, bukan salinan waktu/render persis. Tujuh jalur lurus khusus Orvio; efek lain tidak diklaim.',
    ],
    '0.2.2': [
      'Baris 5/7 tombol terpisah, input berurutan dan pindah otomatis, pemeriksaan duplikat/pengulangan dan Esc untuk batal. Tombol salin peta/pilihan dihapus, URL/riwayat tetap ada. Layar penuh diminta saat klik/Enter awal dan bertahan di pilihan; ditolak/tidak didukung tidak menghalangi bermain.',
    ],
    '0.2.1': [
      'Lebar jalur piksel bulat mencegah sisi kanan terpotong saat ubah ukuran. Efek pendek orisinal mengganti sinar tinggi, kilatan seluruh area MAX100 dihapus. Not tahan gagal tetap menampilkan sisa redup tanpa masuk ulang atau mengubah skor.',
    ],
    '0.2.0': [
      'Kepala not tahan tetap di garis, badan terlihat sampai dilepas. Sinkronisasi output terdengar otomatis menggantikan kalibrasi manual, mengabaikan offset lama dan memperhitungkan input terlambat.',
      'Konsol lagu, sempurna emas/gagal merah/efek per jalur, pratinjau audio, menu keyboard dan jeda/pengaturan/lanjut. Lima bahasa tersimpan. Beranda/pilihan Astro dan 18 URL peta aman untuk muat ulang/riwayat. Situs utama/cermin, pemeriksaan per jam, bukti kegagalan dan pemulihan.',
    ],
    '0.1.0': [
      'Prototipe keyboard pertama: tiga lagu synth orisinal, 18 peta mudah/normal/sulit di 5/7 jalur dengan not tahan. Tombol, posisi, kalibrasi manual (kemudian dihapus), jam audio, penilaian, akurasi, kombo, dan hasil.',
      'Pengaturan lokal, ponsel hanya untuk menjelajah, tes deterministik/browser, CI, lisensi dan dokumentasi kontribusi/keamanan. Kesetaraan persis waktu/bobot/pembulatan DJMAX belum terbukti. FPS tergantung perangkat; tanpa multipemain, peringkat tersimpan, atau aplikasi desktop.',
    ],
  },
  tr: {
    '0.2.9': [
      'Hızlı notalar tek keskin başla yalnızca önceki kareye kadar olan boşluğu birleştirir. Basılı nota, duraklama ve düşük hız değişmez. Fiziksel ekran sorununun çözümü henüz doğrulanmadı.',
      'Sonuçta parça, tuş, zorluk ve kaydedilen seçenekler gösterilir. Bağlantıdan tekrar oyun harita ve seçenekleri geri getirir, ana sayfayı değil. Eski eksik değerler uydurulmaz. Yinelenen metin kaldırıldı.',
      'Kısa yatay ayarlar sıkılaştırıldı. Testler çözülmüş pikselleri karşılaştırır ve hafif saati okur; değerlendirme eşikleri aynı.',
    ],
    '0.2.8': [
      'Oyun sonu ve paylaşılan bağlantıda aynı sonuç ekranı. Daha büyük değerlendirme yazıları; bağlantı alanı, gizlilik metni ve performans verileri kaldırıldı. Kopyalama bildirimi pencerenin üzerinde.',
      'Ayarlar kaydırmasız; dar ve kısa ekranlarda sekmeler var. Yeni görüntü çözülene kadar eski arka plan gizlenir.',
      'Sonuçlar URL parçasından yalnızca tarayıcıda işlenir. Sunucu işlevleri ve kişisel önizlemeler kaldırıldı; eski bağlantılar yerelde açılır. Görsel saat yumuşatma ve boyut önbelleği notaları, hızı veya değerlendirmeyi değiştirmez. Fiziksel ekranda yüksek hız algısı doğrulanmadı.',
    ],
    '0.2.7': [
      'Fransızca, Almanca, Portekizce, İtalyanca, Rusça, Endonezce, Türkçe ve Vietnamca eklendi: menüler, ayarlar, sonuçlar ve tüm sürüm geçmişi için 13 dil.',
      'Tarayıcı algılama, elle seçim, yerel yazı tipleri ve düzenler yeni dillere genişletildi. Şarkı adları ve teknik efekt adları değişmez.',
    ],
    '0.2.6': [
      'Hız, kaydırıcı yerine 0,5 adımlı seçimle ayarlanır. İlk/sıfırlama değeri 1,5; eski kesin değerler değiştirilene kadar işaretli kalır. Varsayılan tarayıcı dili, elle seçim ve İngilizce yedek dil.',
      'Şeritlerin altında hız, sıra ve görünürlük için üç özgün simge. Büyük hız sayısı, soluk kapalı durumlar ve fare/klavye odağında açıklamalar. F3 ve duraklatılmış değişiklikler korunur.',
      'Paylaş simgesi hemen kopyalar. Sonuç adresi paylaşım adresidir; elle kopyalamak için de gösterilir. Adres değişikliği veri göndermez; açılan bağlantı aynı değerleri gösterir. PNG metni son boyutta yumuşatılır; yeni v2 bağlantıları, eski v1 desteği.',
      'Sol/orta/sağ küçük düzenler, gerçek tuş simgeleri, sabit giriş düğmeleri ve ayrı açıklama kaymayı önler. O sürümün beş dilindeki web geçmişine ana/şarkı seçiminden erişilir, oyun başlığı eklenmez. Opak kare temizliği ve piksel hizalama; fiziksel ekran hareketi doğrulanmadı.',
    ],
    '0.2.5': [
      'Puan, doğruluk ve en yüksek kombo açıkça paylaşılır; sunucu HTML ve 1200×630 PNG ile varsayılan OG verileri. Kimlik, zaman ya da cihaz verisi yok. Yerel, doğrulanmamış sonuç; sıralama değil. Bu sürümde Paylaş öncesi gönderilmez.',
      'Yüklemede üç özgün şarkı arka planı ve adları. Görüntü çözüldükten sonra en az 0,9 saniye gösterilir, ses/çizim saat başlamadan hazırlanır. Giriş/odak koruması ve sonuçlarda Geri klavye odağı.',
    ],
    '0.2.4': [
      'Oyun içi hız/sıra/görünürlük değerlerine tık/F3 erişimi sesi ve puanı duraklatır. Hız/görünürlük notaları, uzun notaları veya puanı değiştirmez. Sıra değişikliği açık yeniden başlatma ister; iptal harita/tohumu korur. Gecikmiş pencere kapanışı ve yönergeler düzeltildi.',
    ],
    '0.2.3': [
      'Ayrı F3 seçenekleri: 0,1 adımla 1,0–9,0 hız, FADE IN/IN2/OUT/OUT2, MIRROR ve tohumlu RANDOM. Birebir şerit sırası uzun notaları/akorları ve URL tohumunu korur. Hız F2 dışına taşındı; yeni/sıfır alan solda, kayıtlı konum korunur.',
      'GPU maskeleri yayından önce doğrudan uzun nota kırpmasıyla değiştirildi. Adlar ve yaklaşık görünürlük alanları RESPECT V topluluk belgelerine dayanır, birebir zaman/çizim kopyası değildir. Yedi düz şerit Orvio özeldir; başka efekt iddiası yok.',
    ],
    '0.2.2': [
      'Ayrı 5/7 tuş satırları, ardışık giriş ve otomatik ilerleme, yinelenen/tekrar kontrolü ve Esc iptali. Harita/seçim kopya düğmeleri kaldırıldı, URL/geçmiş korundu. İlk tık/Enter ile tam ekran istenir ve seçime geçerken korunur; ret/desteksizlik oyunu engellemez.',
    ],
    '0.2.1': [
      'Tam piksel şerit genişlikleri boyut değişiminde sağ kenar kesilmesini önler. Uzun ışınlar yerine kısa özgün efekt, tüm alan MAX100 flaşları kaldırıldı. Kaçan uzun notalarda soluk kalan bölüm korunur, yeniden giriş veya puan değişikliği yok.',
    ],
    '0.2.0': [
      'Uzun nota başları çizgide, gövdeler bırakılana kadar görünür. Duyulan çıkışa otomatik eşitleme elle kalibrasyonun yerini alır, eski ofsetleri yok sayar ve gecikmiş girişleri hesaba katar.',
      'Şarkı konsolu, altın kusursuz/kırmızı kaçırma/kademeli şerit efektleri, önizleme, klavye menüleri ve duraklat/ayar/devam. Beş kayıtlı dil. Astro ana/seçim ve yenileme/geçmiş güvenli 18 harita URL. Ana/eski ayna, saatlik kontrol, hata kanıtı ve kurtarma yönergesi.',
    ],
    '0.1.0': [
      'İlk klavye prototipi: üç özgün sentez şarkısı, uzun notalı 5/7 şeritte 18 kolay/normal/zor harita. Tuşlar, konum, elle kalibrasyon (sonra kaldırıldı), ses saati, değerlendirme, doğruluk, kombo ve sonuçlar.',
      'Yerel ayarlar, mobil yalnız göz atma, deterministik/tarayıcı testleri, CI, lisans ve katkı/güvenlik belgeleri. Kesin DJMAX zaman/ağırlık/yuvarlama eşitliği kanıtlanmadı. FPS cihaza bağlı; çok oyunculu, kalıcı sıralama veya masaüstü uygulaması yok.',
    ],
  },
  vi: {
    '0.2.9': [
      'Nốt nhanh chỉ nối khoảng cách tới khung trước với một đầu rõ nét. Giữ nốt, tạm dừng và tốc độ thấp không đổi. Chưa xác nhận giải quyết triệu chứng trên màn hình thực.',
      'Kết quả có bài hát, phím, độ khó và tùy chọn đã ghi. Chơi lại từ liên kết khôi phục bản nốt và tùy chọn thay vì trang đầu. Không bịa tùy chọn còn thiếu ở liên kết cũ. Bỏ chữ hoàn thành trùng.',
      'Cài đặt gọn hơn ở màn hình ngang thấp. Kiểm thử so sánh điểm ảnh giải mã và đọc đồng hồ nhẹ; ngưỡng đánh giá không đổi.',
    ],
    '0.2.8': [
      'Cùng màn hình kết quả sau khi chơi và khi mở liên kết. Nhãn đánh giá lớn hơn; bỏ ô liên kết, giải thích riêng tư và số liệu hiệu năng. Thông báo sao chép hiện trên hộp thoại.',
      'Cài đặt không cuộn, dùng thẻ trên màn hình hẹp và thấp. Ẩn nền cũ đến khi giải mã xong ảnh mới.',
      'Kết quả chỉ xử lý trong trình duyệt từ phần fragment URL. Bỏ hàm máy chủ và ảnh xem trước điểm cá nhân; liên kết cũ vẫn đọc cục bộ. Làm mượt đồng hồ hình ảnh và lưu kích thước không đổi nốt, tốc độ hay đánh giá. Chưa xác nhận cảm nhận nốt nhanh trên màn hình thực.',
    ],
    '0.2.7': [
      'Thêm tiếng Pháp, Đức, Bồ Đào Nha, Ý, Nga, Indonesia, Thổ Nhĩ Kỳ và Việt: 13 ngôn ngữ cho menu, cài đặt, kết quả và toàn bộ lịch sử phiên bản.',
      'Mở rộng nhận diện trình duyệt, chọn thủ công, phông cục bộ và bố cục cho ngôn ngữ mới. Tên bài hát và tên kỹ thuật của hiệu ứng giữ nguyên.',
    ],
    '0.2.6': [
      'Tốc độ chọn theo bước 0,5 thay cho thanh trượt. Mặc định/đặt lại 1,5; giá trị cũ chính xác được ghi rõ đến khi đổi. Mặc định theo ngôn ngữ trình duyệt, có chọn tay và dự phòng tiếng Anh.',
      'Ba biểu tượng gốc dưới làn cho tốc độ, thứ tự và hiển thị. Số tốc độ lớn, trạng thái tắt mờ và mô tả khi trỏ/đặt tiêu điểm. Giữ F3 và thay đổi khi tạm dừng.',
      'Biểu tượng chia sẻ sao chép ngay. Địa chỉ kết quả là liên kết chia sẻ và hiện để chép tay. Đổi địa chỉ không gửi dữ liệu; mở liên kết hiện cùng giá trị. Chữ PNG làm mịn ở kích thước cuối; liên kết v2 mới, vẫn mở v1.',
      'Hình nhỏ trái/giữa/phải, ký hiệu phím thật, nút nhập cố định và hướng dẫn riêng ngăn xê dịch. Lịch sử web bằng năm ngôn ngữ lúc đó, từ trang chủ/chọn bài mà không thêm đầu trang khi chơi. Xóa khung hình đục và căn pixel; chuyển động trên màn hình thật chưa xác minh.',
    ],
    '0.2.5': [
      'Chia sẻ rõ ràng điểm, độ chính xác và combo cao nhất qua HTML máy chủ và PNG 1200×630, thêm siêu dữ liệu OG mặc định. Không danh tính, thời gian hay thiết bị. Kết quả cục bộ chưa xác minh, không phải xếp hạng; bản này không gửi trước khi Chia sẻ.',
      'Ba nền bài hát gốc và tiêu đề khi tải. Sau giải mã ảnh, hiển thị ít nhất 0,9 giây và chuẩn bị âm thanh/kết xuất trước đồng hồ. Bảo vệ nhập/tiêu điểm, đặt tiêu điểm bàn phím vào Trở về ở kết quả.',
    ],
    '0.2.4': [
      'Giá trị tốc độ/thứ tự/hiển thị khi chơi qua nhấp/F3, tạm dừng âm thanh và chấm điểm. Tốc độ/hiển thị giữ bản nốt, nốt giữ và điểm. Đổi thứ tự cần xác nhận chơi lại; hủy giữ bản nốt/seed cũ. Sửa tranh chấp đóng hộp thoại trễ và hướng dẫn.',
    ],
    '0.2.3': [
      'Tùy chọn F3 riêng: tốc độ 1,0–9,0 bước 0,1, FADE IN/IN2/OUT/OUT2, MIRROR và RANDOM có seed. Hoán vị một-một giữ nốt giữ/hợp âm và seed URL. Tốc độ ra khỏi F2; vùng mới/đặt lại ở trái, giữ vị trí đã lưu.',
      'Bỏ mặt nạ GPU trước phát hành, dùng cắt trực tiếp nốt giữ. Tên và vùng hiển thị gần đúng theo tài liệu cộng đồng RESPECT V, không sao chép thời gian/kết xuất chính xác. Bảy làn thẳng là riêng Orvio; không khẳng định hiệu ứng khác.',
    ],
    '0.2.2': [
      'Hàng 5/7 phím riêng, nhập liên tiếp và tự chuyển, kiểm tra trùng/lặp và Esc hủy. Bỏ nút chép bản nốt/lựa chọn nhưng giữ URL/lịch sử. Yêu cầu toàn màn hình ngay khi nhấp/Enter đầu và giữ sang chọn bài; từ chối/không hỗ trợ vẫn chơi được.',
    ],
    '0.2.1': [
      'Làn có chiều rộng pixel nguyên tránh cắt mép phải khi đổi kích thước. Hiệu ứng ngắn gốc thay tia cao, bỏ chớp MAX100 toàn vùng. Nốt giữ bị trượt còn phần đuôi mờ, không nhập lại hay đổi điểm.',
    ],
    '0.2.0': [
      'Đầu nốt giữ ở vạch, thân còn thấy đến khi thả. Đồng bộ đầu ra nghe được tự động thay cân chỉnh tay, bỏ offset cũ và tính thao tác trễ.',
      'Bảng chọn bài, hoàn hảo vàng/trượt đỏ/hiệu ứng từng làn, nghe thử, menu bàn phím và dừng/cài đặt/tiếp tục. Năm ngôn ngữ lưu lại. Trang chủ/chọn Astro và 18 URL bản nốt an toàn khi tải lại/lịch sử. Trang chính/gương cũ, kiểm tra mỗi giờ, bằng chứng lỗi và quy trình phục hồi.',
    ],
    '0.1.0': [
      'Bản mẫu bàn phím đầu: ba bài synth gốc, 18 bản nốt dễ/thường/khó cho 5/7 làn có nốt giữ. Gán phím, vị trí, cân chỉnh tay (sau bỏ), đồng hồ âm thanh, chấm điểm, chính xác, combo và kết quả.',
      'Cài đặt cục bộ, điện thoại chỉ xem, kiểm thử xác định/trình duyệt, CI, giấy phép và tài liệu đóng góp/bảo mật. Chưa xác minh tương đương chính xác thời gian/trọng số/làm tròn DJMAX. FPS tùy thiết bị; không nhiều người, xếp hạng lưu trữ hay ứng dụng máy tính.',
    ],
  },
};
