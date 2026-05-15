import type { ReactNode } from "react";

/**
 * Lightweight markdown-to-React renderer.
 * Supports: headings, bold, italic, inline code, code blocks, links, lists,
 * paragraphs, and inline citation badges [1], [2], etc.
 * No heavy deps — just regex parsing.
 */

interface MarkdownProps {
  content: string;
  className?: string;
  sources?: { url: string; title?: string }[];
}

function parseInline(text: string, sources?: { url: string; title?: string }[]): ReactNode[] {
  const parts: ReactNode[] = [];
  // Pattern order matters — match longer patterns first
  // Added citation pattern \[\d+\] for inline source references
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\[(\d+)\](?:\[(\d+)\])*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold italic ***text***
      parts.push(<strong key={key++} className="font-semibold italic text-zinc-100">{match[2]}</strong>);
    } else if (match[3]) {
      // Bold **text**
      parts.push(<strong key={key++} className="font-semibold text-zinc-100">{match[3]}</strong>);
    } else if (match[4]) {
      // Italic *text*
      parts.push(<em key={key++} className="italic text-zinc-300">{match[4]}</em>);
    } else if (match[5]) {
      // Inline code `code`
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[13px] font-mono">
          {match[5]}
        </code>
      );
    } else if (match[6] && match[7]) {
      // Link [text](url)
      parts.push(
        <a key={key++} href={match[7]} target="_blank" rel="noopener noreferrer"
           className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
          {match[6]}
        </a>
      );
    } else if (match[8]) {
      // Citation badge [1], [2], [1][3], etc.
      // Extract all consecutive citation numbers from the full match
      const fullCitationMatch = match[0];
      const citationNums = [...fullCitationMatch.matchAll(/\[(\d+)\]/g)];
      
      citationNums.forEach((cm) => {
        const num = parseInt(cm[1]!, 10);
        const sourceIndex = num - 1;
        const source = sources?.[sourceIndex];
        
        if (source?.url) {
          parts.push(
            <a
              key={key++}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              title={source.title || source.url}
              className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-semibold hover:bg-blue-500/30 transition-colors cursor-pointer align-super ml-0.5 no-underline"
            >
              {num}
            </a>
          );
        } else {
          parts.push(
            <span
              key={key++}
              className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-zinc-700/50 text-zinc-400 text-[10px] font-semibold align-super ml-0.5"
            >
              {num}
            </span>
          );
        }
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function parseMarkdownBlocks(content: string, sources?: { url: string; title?: string }[]): ReactNode[] {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Code block ```
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={key++} className="my-3 rounded-lg overflow-hidden border border-zinc-800/60">
          {lang && (
            <div className="px-3 py-1.5 bg-zinc-800/60 text-[11px] text-zinc-500 uppercase tracking-wider font-medium border-b border-zinc-800/60">
              {lang}
            </div>
          )}
          <pre className="p-3 bg-zinc-900/60 overflow-x-auto scrollbar-thin">
            <code className="text-[13px] font-mono text-zinc-300 leading-relaxed">{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const text = headingMatch[2]!;
      const sizes: Record<number, string> = {
        1: "text-xl font-bold mt-6 mb-3 text-zinc-100",
        2: "text-lg font-semibold mt-5 mb-2 text-zinc-100",
        3: "text-base font-semibold mt-4 mb-2 text-zinc-200",
        4: "text-sm font-semibold mt-3 mb-1 text-zinc-200",
        5: "text-sm font-medium mt-3 mb-1 text-zinc-300",
        6: "text-xs font-medium mt-2 mb-1 text-zinc-400",
      };
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      elements.push(<Tag key={key++} className={sizes[level]}>{parseInline(text, sources)}</Tag>);
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^\s*[-*+]\s+/)) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i]!.match(/^\s*[-*+]\s+/)) {
        const itemText = lines[i]!.replace(/^\s*[-*+]\s+/, "");
        items.push(
          <li key={items.length} className="flex gap-2 text-zinc-300 leading-relaxed">
            <span className="text-zinc-600 mt-1.5 flex-shrink-0">•</span>
            <span>{parseInline(itemText, sources)}</span>
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={key++} className="flex flex-col gap-1.5 my-2">
          {items}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^\s*\d+\.\s+/)) {
      const items: ReactNode[] = [];
      let num = 1;
      while (i < lines.length && lines[i]!.match(/^\s*\d+\.\s+/)) {
        const itemText = lines[i]!.replace(/^\s*\d+\.\s+/, "");
        items.push(
          <li key={items.length} className="flex gap-2 text-zinc-300 leading-relaxed">
            <span className="text-zinc-500 font-medium flex-shrink-0 min-w-[1.25rem]">{num}.</span>
            <span>{parseInline(itemText, sources)}</span>
          </li>
        );
        num++;
        i++;
      }
      elements.push(
        <ol key={key++} className="flex flex-col gap-1.5 my-2">
          {items}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-l-2 border-zinc-700 pl-4 my-3 text-zinc-400 italic">
          {parseInline(quoteLines.join(" "), sources)}
        </blockquote>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push(<hr key={key++} className="my-4 border-zinc-800" />);
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-empty, non-special lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !lines[i]!.match(/^#{1,6}\s+/) &&
      !lines[i]!.match(/^\s*[-*+]\s+/) &&
      !lines[i]!.match(/^\s*\d+\.\s+/) &&
      !lines[i]!.startsWith(">") &&
      !lines[i]!.startsWith("```") &&
      !lines[i]!.match(/^[-*_]{3,}$/)
    ) {
      paraLines.push(lines[i]!);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={key++} className="text-zinc-300 leading-relaxed my-2">
          {parseInline(paraLines.join(" "), sources)}
        </p>
      );
    }
  }

  return elements;
}

export function Markdown({ content, className = "", sources }: MarkdownProps) {
  if (!content) return null;
  return (
    <div className={`prose-custom ${className}`}>
      {parseMarkdownBlocks(content, sources)}
    </div>
  );
}
