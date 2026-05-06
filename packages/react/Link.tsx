import React, { useCallback } from "react";

type LinkProps = {
  href: string;
  children?: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  style?: React.CSSProperties;
};

export function Link(
  { href, children, className, target, rel, style }: LinkProps,
): React.ReactElement {
  const isExternal = href.startsWith("http://") ||
    href.startsWith("https://") || href.startsWith("//");

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        isExternal || target === "_blank" || e.metaKey || e.ctrlKey ||
        e.shiftKey
      ) {
        return;
      }
      e.preventDefault();

      globalThis.history.pushState(null, "", href);
      globalThis.dispatchEvent(new PopStateEvent("popstate"));
    },
    [href, isExternal, target],
  );

  return React.createElement(
    "a",
    { href, onClick, className, target, rel, style },
    children,
  );
}

export default Link;
