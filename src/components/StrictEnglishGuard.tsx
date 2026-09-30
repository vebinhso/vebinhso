import { useEffect } from "react";
import { useLocale } from "@/lib/locale";
import { STRICT_ENGLISH_UI } from "@/lib/strict-english.generated";

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const originals = new WeakMap<Node, string>();
const attributeOriginals = new WeakMap<Element, Map<string, string>>();
const hasVietnamese = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠ-ỹđ]/;

function normalized(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function translateValue(value: string): string {
  const direct = STRICT_ENGLISH_UI[value] ?? STRICT_ENGLISH_UI[normalized(value)];
  if (direct) {
    const lead = value.match(/^\s*/)?.[0] ?? "";
    const tail = value.match(/\s*$/)?.[0] ?? "";
    return `${lead}${direct}${tail}`;
  }
  if (!hasVietnamese.test(value)) return value;

  // Dynamic UI often combines a translated label with a runtime number/name.
  let result = value;
  const phrases = Object.entries(STRICT_ENGLISH_UI)
    .filter(([vi]) => vi.length >= 4 && !vi.includes("${") && result.includes(vi))
    .sort(([a], [b]) => b.length - a.length);
  for (const [vi, en] of phrases) result = result.split(vi).join(en);
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
  if (!originals.has(node)) originals.set(node, value);
  const source = originals.get(node) ?? value;
  const next = translateValue(source);
  if (next !== node.nodeValue) node.nodeValue = next;
}

function translateElement(element: Element) {
  if (element.closest("[data-no-auto-translate]")) return;
  for (const attr of ATTRS) {
    const value = element.getAttribute(attr);
    if (!value) continue;
    let saved = attributeOriginals.get(element);
    if (!saved) {
      saved = new Map();
      attributeOriginals.set(element, saved);
    }
    if (!saved.has(attr)) saved.set(attr, value);
    const next = translateValue(saved.get(attr) ?? value);
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
      const value = originals.get(node);
      if (value !== undefined) node.nodeValue = value;
    } else if (node instanceof Element) {
      const saved = attributeOriginals.get(node);
      saved?.forEach((value, attr) => node.setAttribute(attr, value));
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
    let translating = false;
    const observer = new MutationObserver((mutations) => {
      if (translating) return;
      translating = true;
      try {
        for (const mutation of mutations) {
          if (mutation.type === "characterData") translateText(mutation.target as Text);
          mutation.addedNodes.forEach(walk);
          if (mutation.type === "attributes" && mutation.target instanceof Element) translateElement(mutation.target);
        }
      } finally {
        translating = false;
      }
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
