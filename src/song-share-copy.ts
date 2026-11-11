/** A second, direct user gesture also works when async clipboard activation expires. */
export function showSongLink(url: string, korean: boolean) {
  const dialog = document.createElement('dialog');
  dialog.className = 'song-link-dialog';
  dialog.onclick = (e) => {
    const dialog = e.currentTarget as HTMLDialogElement;
    if (e.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      e.clientX < bounds.left - 4 ||
      e.clientX > bounds.right + 4 ||
      e.clientY < bounds.top - 4 ||
      e.clientY > bounds.bottom + 4
    )
      dialog.close();
  };
  const heading = document.createElement('h2');
  heading.textContent = korean ? '곡 공유 링크' : 'Song link';
  const note = document.createElement('p');
  note.textContent = korean
    ? '받는 사람이 추가를 눌러야 자기 곡 목록에 저장됩니다. 결과와 리플레이는 포함되지 않습니다.'
    : 'The recipient chooses Add to save it to their library. No score or replay is included.';
  const input = document.createElement('textarea');
  input.readOnly = true;
  input.value = url;
  input.setAttribute(
    'aria-label',
    korean ? '공유할 곡 링크' : 'Song link to share',
  );
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const copy = document.createElement('button');
  copy.className = 'primary';
  copy.textContent = korean ? '링크 복사' : 'Copy link';
  copy.onclick = () => {
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        status.textContent = korean ? '링크를 복사했어요' : 'Link copied';
      })
      .catch(() => {
        input.focus();
        input.select();
        status.textContent = korean
          ? '선택된 링크를 직접 복사해 주세요.'
          : 'Copy the selected link manually.';
      });
  };
  const close = document.createElement('button');
  close.className = 'quiet';
  close.textContent = korean ? '닫기' : 'Close';
  close.onclick = () => dialog.close();
  const actions = document.createElement('div');
  actions.className = 'song-link-actions';
  actions.append(close, copy);
  dialog.append(heading, note, input, status, actions);
  document.body.append(dialog);
  dialog.onclose = () => dialog.remove();
  dialog.showModal();
  copy.focus();
}
