import { useEffect } from "react";
import { useLocale } from "@/lib/locale";
import { STRICT_ENGLISH_UI as BASE_UI } from "@/lib/strict-english.generated";
import { ROLEPLAY_UI_EN } from "@/lib/roleplay-ui-en";

const STRICT_ENGLISH_UI: Record<string, string> = { ...BASE_UI, ...ROLEPLAY_UI_EN };

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const textState = new WeakMap<Node, { source: string; rendered: string }>();
const attributeState = new WeakMap<Element, Map<string, { source: string; rendered: string }>>();
const hasVietnamese = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠ-ỹđ]/;
const dynamicPhrases = Object.entries(STRICT_ENGLISH_UI)
  .filter(([vi, en]) => vi.length >= 4 && vi !== en && !vi.includes("${"))
  .sort(([a], [b]) => b.length - a.length);

function normalized(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const cache = new Map<string, string>();
function translateValue(value: string): string {
  const hit = cache.get(value);
  if (hit !== undefined) return hit;
  const out = translateUncached(value);
  if (cache.size > 5000) cache.clear();
  cache.set(value, out);
  return out;
}

function translateUncached(value: string): string {
  const direct = STRICT_ENGLISH_UI[value] ?? STRICT_ENGLISH_UI[normalized(value)];
  if (direct) {
    const lead = value.match(/^\s*/)?.[0] ?? "";
    const tail = value.match(/\s*$/)?.[0] ?? "";
    return `${lead}${direct}${tail}`;
  }
  if (!hasVietnamese.test(value)) return value;

  // Dynamic UI often combines a translated label with a runtime number/name.
  let result = value;
  for (const [vi, en] of dynamicPhrases) {
    if (result.includes(vi)) result = result.split(vi).join(en);
  }
  return result;
}

function shouldSkip(node: Node): boolean {
  const parent = node.parentElement;
  return !!parent?.closest("script,style,code,pre,[contenteditable='true'],[data-no-auto-translate]");
}

function translateText(node: Text) {
  if (shouldSkip(node)) return;
  const value = node.nodeValue ?? "";
  if (!value.trim()) return;
  const previous = textState.get(node);
  const source = previous && value === previous.rendered ? previous.source : value;
  const next = translateValue(source);
  textState.set(node, { source, rendered: next });
  if (next !== node.nodeValue) node.nodeValue = next;
}

function translateElement(element: Element) {
  if (element.closest("[data-no-auto-translate]")) return;
  for (const attr of ATTRS) {
    const value = element.getAttribute(attr);
    if (!value) continue;
    let saved = attributeState.get(element);
    if (!saved) {
      saved = new Map();
      attributeState.set(element, saved);
    }
    const previous = saved.get(attr);
    const source = previous && value === previous.rendered ? previous.source : value;
    const next = translateValue(source);
    saved.set(attr, { source, rendered: next });
    if (next !== value) element.setAttribute(attr, next);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root instanceof Element) translateElement(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) translateText(current as Text);
    else translateElement(current as Element);
    current = walker.nextNode();
  }
}

function restore(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [root];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = textState.get(node)?.source;
      if (value !== undefined) node.nodeValue = value;
    } else if (node instanceof Element) {
      const saved = attributeState.get(node);
      saved?.forEach((value, attr) => node.setAttribute(attr, value.source));
    }
  }
}

export function StrictEnglishGuard() {
  const locale = useLocale();

  useEffect(() => {
    const root = document.body;
    if (locale !== "en") {
      restore(root);
      return;
    }

    walk(root);
    const nativeAlert = window.alert;
    const nativeConfirm = window.confirm;
    const nativePrompt = window.prompt;
    window.alert = (message) => nativeAlert(translateValue(String(message ?? "")));
    window.confirm = (message) => nativeConfirm(translateValue(String(message ?? "")));
    window.prompt = (message, defaultValue) => nativePrompt(translateValue(String(message ?? "")), defaultValue);
    const pending = new Set<Node>();
    let frame = 0;
    const flush = () => {
      frame = 0;
      observer.disconnect();
      pending.forEach((n) => {
        if (!n.isConnected) return;
        if (n.nodeType === Node.TEXT_NODE) translateText(n as Text);
        else if (n instanceof Element && n.childNodes.length === 0) translateElement(n);
        else walk(n);
      });
      pending.clear();
      observer.observe(root, OPTS);
    };
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") m.addedNodes.forEach((n) => pending.add(n));
        else pending.add(m.target);
      }
      if (!frame) frame = requestAnimationFrame(flush);
    });
    const OPTS: MutationObserverInit = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] };
    observer.observe(root, OPTS);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
      window.prompt = nativePrompt;
    };
  }, [locale]);

  return null;
}
