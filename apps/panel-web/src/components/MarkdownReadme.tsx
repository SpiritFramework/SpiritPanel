import { createElement, useMemo, useState, type ReactNode } from 'react';



const INITIAL_BLOCK_LIMIT = 48;



type Block =

  | { type: 'heading'; level: number; text: string }

  | { type: 'paragraph'; text: string }

  | { type: 'list'; ordered: boolean; items: string[] }

  | { type: 'code'; lang: string; code: string }

  | { type: 'hr' };



function inlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\)|<(https?:\/\/[^>]+)>|(https?:\/\/[^\s<]+[^\s<.,;:!?"'\])])|(`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    if (match[2] && match[3]) {
      nodes.push(
        <a key={key++} href={match[3]} target="_blank" rel="noreferrer" className="mp-readme-link">
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(
        <a key={key++} href={match[4]} target="_blank" rel="noreferrer" className="mp-readme-link">
          {match[4]}
        </a>,
      );
    } else if (match[5]) {
      const href = match[5];
      nodes.push(
        <a key={key++} href={href} target="_blank" rel="noreferrer" className="mp-readme-link">
          {href}
        </a>,
      );
    } else if (match[6]) {
      nodes.push(
        <code key={key++} className="mp-readme-inline-code">
          {match[6]}
        </code>,
      );
    } else if (match[7]) {
      nodes.push(<strong key={key++}>{match[7]}</strong>);
    } else if (match[8]) {
      nodes.push(<em key={key++}>{match[8]}</em>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}



function parseMarkdown(source: string): Block[] {

  const blocks: Block[] = [];

  const lines = source.replace(/\r\n/g, '\n').split('\n');

  let i = 0;



  while (i < lines.length) {

    const line = lines[i] ?? '';



    if (line.trim().startsWith('```')) {

      const lang = line.trim().slice(3).trim();

      const codeLines: string[] = [];

      i++;

      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {

        codeLines.push(lines[i] ?? '');

        i++;

      }

      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });

      i++;

      continue;

    }



    if (/^#{1,6}\s/.test(line)) {

      const level = line.match(/^#+/)![0].length;

      blocks.push({ type: 'heading', level, text: line.replace(/^#+\s*/, '') });

      i++;

      continue;

    }



    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {

      blocks.push({ type: 'hr' });

      i++;

      continue;

    }



    if (/^[-*+]\s/.test(line)) {

      const items: string[] = [];

      while (i < lines.length && /^[-*+]\s/.test(lines[i] ?? '')) {

        items.push((lines[i] ?? '').replace(/^[-*+]\s/, ''));

        i++;

      }

      blocks.push({ type: 'list', ordered: false, items });

      continue;

    }



    if (/^\d+\.\s/.test(line)) {

      const items: string[] = [];

      while (i < lines.length && /^\d+\.\s/.test(lines[i] ?? '')) {

        items.push((lines[i] ?? '').replace(/^\d+\.\s/, ''));

        i++;

      }

      blocks.push({ type: 'list', ordered: true, items });

      continue;

    }



    if (!line.trim()) {

      i++;

      continue;

    }



    const para: string[] = [];

    while (i < lines.length && (lines[i] ?? '').trim() && !/^#{1,6}\s/.test(lines[i] ?? '') && !/^[-*+]\s/.test(lines[i] ?? '') && !/^\d+\.\s/.test(lines[i] ?? '') && !(lines[i] ?? '').trim().startsWith('```')) {

      para.push(lines[i] ?? '');

      i++;

    }

    blocks.push({ type: 'paragraph', text: para.join(' ') });

  }



  return blocks;

}



function renderBlock(block: Block, index: number) {

  if (block.type === 'heading') {

    const level = Math.min(block.level, 6);

    return createElement(

      `h${level}`,

      { key: index, className: `mp-readme-h${level}` },

      inlineMarkdown(block.text),

    );

  }

  if (block.type === 'paragraph') {

    return (

      <p key={index} className="mp-readme-p">

        {inlineMarkdown(block.text)}

      </p>

    );

  }

  if (block.type === 'list') {

    const List = block.ordered ? 'ol' : 'ul';

    return (

      <List key={index} className="mp-readme-list">

        {block.items.map((item, itemIndex) => (

          <li key={itemIndex}>{inlineMarkdown(item)}</li>

        ))}

      </List>

    );

  }

  if (block.type === 'code') {

    return (

      <pre key={index} className="mp-readme-code-block">

        {block.lang && <span className="mp-readme-code-lang">{block.lang}</span>}

        <code>{block.code}</code>

      </pre>

    );

  }

  return <hr key={index} className="mp-readme-hr" />;

}



export function MarkdownReadme({ source }: { source: string }) {

  const blocks = useMemo(() => parseMarkdown(source), [source]);

  const [expanded, setExpanded] = useState(false);

  const truncated = blocks.length > INITIAL_BLOCK_LIMIT;

  const visibleBlocks = expanded || !truncated ? blocks : blocks.slice(0, INITIAL_BLOCK_LIMIT);



  return (

    <article className="mp-readme-content">

      {visibleBlocks.map((block, index) => renderBlock(block, index))}

      {truncated && !expanded && (

        <button type="button" className="mp-readme-expand" onClick={() => setExpanded(true)}>

          Show full documentation ({blocks.length - INITIAL_BLOCK_LIMIT} more sections)

        </button>

      )}

    </article>

  );

}


