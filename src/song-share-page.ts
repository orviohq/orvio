import { decodeOpus35Song } from './opus/opus35-song';
import {
  parseSongShare,
  inspectSongLink,
  addSharedSong,
  type InspectedSong,
} from './song-share';
import { SongShareSaveError } from './song-share-save-diagnostic';
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
        '저장을 완료하지 못했습니다. 같은 링크에서 추가를 다시 눌러 주세요. 새 추출은 시작하지 않습니다.',
      noExtraction: '새 추출은 시작하지 않습니다.',
      cause: {
        connection: '잠시 후 내 곡 목록에 추가를 다시 눌러 주세요.',
        http: '같은 링크에서 추가를 다시 눌러 주세요.',
        integrity: '같은 링크에서 추가를 다시 눌러 주세요.',
        quota: '이 브라우저의 저장 공간을 확인한 뒤 다시 눌러 주세요.',
        storage: '브라우저의 저장 설정을 확인한 뒤 다시 눌러 주세요.',
        aborted: '다시 추가를 눌러 주세요.',
        unknown: '같은 링크에서 추가를 다시 눌러 주세요.',
      },
      stage: {
        descriptor_fetch: '보관된 곡 정보를 확인하지 못했습니다.',
        audio_fetch: '보관된 오디오를 불러오지 못했습니다.',
        artifact_verify: '보관된 오디오를 확인하지 못했습니다.',
        decoder_fetch: '오디오 재생 도구를 준비하지 못했습니다.',
        decoder_verify: '오디오 재생 도구를 확인하지 못했습니다.',
        worker_decode: '오디오를 변환하지 못했습니다.',
        cache_write: '오디오 정보를 저장하지 못했습니다.',
        local_save: '이 브라우저에 곡을 저장하지 못했습니다.',
        visibility_write: '목록에 표시하는 정보를 저장하지 못했습니다.',
        order_write: '목록 순서 정보를 저장하지 못했습니다.',
      },
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
        'Saving did not finish. Try Add again from the same link. No new extraction was started.',
      noExtraction: 'No new extraction was started.',
      cause: {
        connection: 'Try Add again shortly.',
        http: 'Try Add again from the same link.',
        integrity: 'Try Add again from the same link.',
        quota: 'Check this browser’s storage space, then try Add again.',
        storage: 'Check this browser’s storage settings, then try Add again.',
        aborted: 'Try Add again.',
        unknown: 'Try Add again from the same link.',
      },
      stage: {
        descriptor_fetch: 'The retained song details could not be checked.',
        audio_fetch: 'The retained audio could not be loaded.',
        artifact_verify: 'The retained audio could not be verified.',
        decoder_fetch: 'The audio tool could not be prepared.',
        decoder_verify: 'The audio tool could not be verified.',
        worker_decode: 'The audio could not be converted.',
        cache_write: 'The audio details could not be saved.',
        local_save: 'This browser could not save the song.',
        visibility_write: 'The list visibility information could not be saved.',
        order_write: 'The list order information could not be saved.',
      },
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
dialog.onclick = (e) => {
  const dialog = e.currentTarget as HTMLDialogElement;
  if (e.target !== dialog || busy) return;
  const bounds = dialog.getBoundingClientRect();
  if (
    e.clientX < bounds.left - 4 ||
    e.clientX > bounds.right + 4 ||
    e.clientY < bounds.top - 4 ||
    e.clientY > bounds.bottom + 4
  ) {
    dialog.close();
    leave();
  }
};
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
    identity = location.hash.startsWith('#v=2&d=')
      ? await decodeOpus35Song(location.hash)
      : parseSongShare(location.hash);
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
  } catch (error) {
    status.textContent =
      error instanceof SongShareSaveError
        ? text.stage[error.stage] +
          ' ' +
          text.cause[error.cause] +
          ' ' +
          text.noExtraction
        : text.failed;
    add.disabled = false;
    cancel.disabled = false;
  } finally {
    busy = false;
  }
};
