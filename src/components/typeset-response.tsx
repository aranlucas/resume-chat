"use client";

import { cn } from "@/lib/utils";
import { createElement, type ComponentProps } from "react";
import { defaultComponents, Streamdown, type Components } from "streamdown";

type ProseTag =
  | "p"
  | "ul"
  | "ol"
  | "li"
  | "strong"
  | "em"
  | "a"
  | "code"
  | "blockquote"
  | "hr"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6";

function plainElement<Tag extends ProseTag>(tag: Tag) {
  return ({
    node: _node,
    className: _className,
    ...props
  }: ComponentProps<Tag> & { node?: unknown }) => createElement(tag, props);
}

// Stable across streaming renders. Only simple prose loses Streamdown's utilities;
// its code/mermaid and table widgets keep their default renderers, outside typeset.
const typesetComponents: Components = {
  p: plainElement("p"),
  ul: plainElement("ul"),
  ol: plainElement("ol"),
  li: plainElement("li"),
  strong: plainElement("strong"),
  em: plainElement("em"),
  a: plainElement("a"),
  inlineCode: plainElement("code"),
  blockquote: plainElement("blockquote"),
  hr: plainElement("hr"),
  h1: plainElement("h1"),
  h2: plainElement("h2"),
  h3: plainElement("h3"),
  h4: plainElement("h4"),
  h5: plainElement("h5"),
  h6: plainElement("h6"),
  code: (props) => <div data-not-typeset>{createElement(defaultComponents.code!, props)}</div>,
  table: (props) => <div data-not-typeset>{createElement(defaultComponents.table!, props)}</div>,
};

// This small client boundary also renders on the server. The resume can share
// markdown typography without importing MessageResponse or the chat application.
export function TypesetResponse({ className, ...props }: ComponentProps<typeof Streamdown>) {
  return (
    <Streamdown
      {...props}
      components={typesetComponents}
      linkSafety={{ enabled: false }}
      className={cn(
        // Restore component-layer margins underneath Streamdown's root space-y utilities.
        "typeset [&_a]:text-cobalt text-[17px] [--typeset-font-heading:var(--font-schibsted)] [--typeset-font-mono:var(--font-mono)] [&_a]:decoration-current [&_a]:underline-offset-2 [&>*]:[margin-block:revert-layer]",
        className,
      )}
    />
  );
}
