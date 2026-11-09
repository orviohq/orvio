/** Main-owned lifetime for a shared result. Closing or replacing a route aborts
 * pending work. A result view is ephemeral; only explicit Add calls install. */
export function createOpus468ShareRouteOwner() {
  let epoch = 0,
    controller: AbortController | undefined,
    view: { revoke(): void } | undefined;
  const close = () => {
    epoch++;
    controller?.abort(Error('share468_route_changed'));
    controller = undefined;
    view?.revoke();
    view = undefined;
  };
  return Object.freeze({
    close,
    begin(href: string, isCurrent: () => boolean) {
      close();
      const token = epoch,
        c = new AbortController();
      controller = c;
      const timer = setTimeout(
        () => c.abort(Error('share468_route_timeout')),
        95000,
      );
      const check = () => {
        c.signal.throwIfAborted();
        if (epoch !== token || !isCurrent())
          throw Error('share468_route_stale');
      };
      return Object.freeze({
        signal: c.signal,
        href,
        check,
        finish(next: { revoke(): void }) {
          check();
          clearTimeout(timer);
          view = next;
        },
        dispose() {
          clearTimeout(timer);
          if (epoch === token) {
            c.abort(Error('share468_route_disposed'));
            controller = undefined;
          }
        },
      });
    },
  });
}
