/** Begin the clipboard write in the original menu gesture. Browsers that
 * support promised ClipboardItem data keep activation while the link is read. */
export async function copySongLink(link: Promise<string>) {
  void link.catch(() => {});
  if (!navigator.clipboard) throw Error('Clipboard unavailable');
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    const body = link.then((url) => new Blob([url], { type: 'text/plain' }));
    void body.catch(() => {});
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/plain': body }),
    ]);
  } else {
    await navigator.clipboard.writeText(await link);
  }
}
