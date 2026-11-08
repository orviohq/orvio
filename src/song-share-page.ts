import {
  parseSongShare,
  inspectSongLink,
  addSharedSong,
  type InspectedSong,
} from './song-share';
const ko = navigator.language.toLowerCase().startsWith('ko');
const text = ko
  ? {
      heading: '이 곡을 내 목록에 추가할까요?',
      checking: '곡 정보를 확인하고 있어요…',
      note: '추가를 누를 때만 이 브라우저의 곡 목록에 저장됩니다. 결과나 리플레이는 공유되지 않습니다.',
      add: '내 곡 목록에 추가',
      cancel: '취소',
      adding: '저장하고 있어요…',
      saved: '내 곡 목록에 저장했어요',
      open: '내 곡 목록 열기',
      invalid: '올바른 곡 공유 링크가 아닙니다.',
      unavailable:
        '곡을 확인할 수 없습니다. 곡이 준비되지 않았거나 연결이 변경됐을 수 있습니다. 자동으로 다시 추출하지 않습니다.',
      failed:
        '저장하지 못했습니다. 보관된 오디오의 연결 상태와 이 브라우저의 저장 공간을 확인한 뒤 다시 시도해 주세요. 새 추출은 시작하지 않습니다.',
    }
  : {
      heading: 'Add this song to your library?',
      checking: 'Checking the song…',
      note: 'Only Add saves this song in this browser. No score or replay is shared.',
      add: 'Add to my library',
      cancel: 'Cancel',
      adding: 'Saving…',
      saved: 'Saved to your library',
      open: 'Open my library',
      invalid: 'This song link is invalid.',
      unavailable:
        'This song could not be verified. It may not be ready or its source may have changed. No new extraction was started.',
      failed:
        'Could not save. Check the retained audio connection, storage space and browser permissions, then try again. No new extraction was started.',
    };
document.documentElement.lang = ko ? 'ko' : 'en';
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const dialog = $<HTMLDialogElement>('song-invite');
const add = $<HTMLButtonElement>('song-add');
const cancel = $<HTMLButtonElement>('song-cancel');
const status = $('song-status');
$('song-heading').textContent = text.heading;
$('song-note').textContent = text.note;
status.textContent = text.checking;
add.textContent = text.add;
cancel.textContent = text.cancel;
let song: InspectedSong | undefined;
let busy = false;
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 20000);
function leave() {
  controller.abort();
  location.replace('/select/');
}
cancel.onclick = leave;
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  if (!busy) leave();
});
window.addEventListener('hashchange', () => {
  song = undefined;
  add.disabled = true;
  controller.abort();
  location.reload();
});
dialog.showModal();
cancel.focus();
void (async () => {
  let identity;
  try {
    identity = parseSongShare(location.hash);
  } catch {
    status.textContent = text.invalid;
    clearTimeout(timer);
    return;
  }
  try {
    song = await inspectSongLink(identity, controller.signal);
    if (controller.signal.aborted) return;
    $('song-title').textContent = song.metadata.title;
    $('song-author').textContent = song.metadata.author ?? 'YouTube';
    $('song-video').textContent = 'YouTube · ' + identity.videoId;
    status.textContent = '';
    add.disabled = false;
  } catch {
    if (!controller.signal.aborted || !song)
      status.textContent = text.unavailable;
  } finally {
    clearTimeout(timer);
  }
})();
add.onclick = async () => {
  if (!song || busy) return;
  busy = true;
  add.disabled = true;
  cancel.disabled = true;
  status.textContent = text.adding;
  try {
    const id = await addSharedSong(song);
    status.textContent = text.saved;
    add.textContent = text.open;
    add.onclick = () =>
      location.assign('/select/?song=' + encodeURIComponent(id));
    add.disabled = false;
    cancel.hidden = true;
  } catch {
    status.textContent = text.failed;
    add.disabled = false;
    cancel.disabled = false;
  } finally {
    busy = false;
  }
};
