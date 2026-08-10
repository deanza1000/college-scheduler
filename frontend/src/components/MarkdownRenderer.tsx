import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink, Code2 } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-border/80 bg-slate-950/90 overflow-hidden shadow-lg dir-ltr text-left">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/80 border-b border-border/60 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-primary" />
          <span className="capitalize font-semibold text-slate-300">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[11px] cursor-pointer"
          title="העתק קוד"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">הועתק!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>העתק</span>
            </>
          )}
        </button>
      </div>

      {/* Code contents */}
      <pre className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-100 bg-slate-950/60 selection:bg-primary/30">
        <code>{value}</code>
      </pre>
    </div>
  );
};

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content text-sm space-y-1.5 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code & Pre
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <CodeBlock
                  language={match ? match[1] : undefined}
                  value={codeString}
                />
              );
            }

            return (
              <code
                className="bg-surfaceHighlight border border-border/80 text-primary font-mono text-[0.85em] px-1.5 py-0.5 rounded-md inline-block dir-ltr"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Headers
          h1({ children }: any) {
            return (
              <h1 className="text-base sm:text-lg font-extrabold text-textPrimary border-b border-border/70 pb-1.5 mt-3 mb-2 flex items-center gap-2">
                {children}
              </h1>
            );
          },
          h2({ children }: any) {
            return (
              <h2 className="text-sm sm:text-base font-bold text-primary border-b border-border/50 pb-1 mt-2.5 mb-1.5">
                {children}
              </h2>
            );
          },
          h3({ children }: any) {
            return (
              <h3 className="text-xs sm:text-sm font-bold text-textPrimary mt-2 mb-1">
                {children}
              </h3>
            );
          },
          h4({ children }: any) {
            return (
              <h4 className="text-xs sm:text-sm font-semibold text-textSecondary mt-1.5 mb-1">
                {children}
              </h4>
            );
          },

          // Paragraphs
          p({ children }: any) {
            return <p className="my-1.5 leading-relaxed text-textPrimary/95">{children}</p>;
          },

          // Lists
          ul({ children }: any) {
            return <ul className="list-disc pr-5 my-2 space-y-1 text-textPrimary/90">{children}</ul>;
          },
          ol({ children }: any) {
            return <ol className="list-decimal pr-5 my-2 space-y-1 text-textPrimary/90">{children}</ol>;
          },
          li({ children }: any) {
            return <li className="leading-relaxed text-sm">{children}</li>;
          },

          // Blockquotes
          blockquote({ children }: any) {
            return (
              <blockquote className="border-r-4 border-primary/80 bg-primary/10 rounded-l-xl pr-3.5 pl-3 py-2 my-2.5 text-textSecondary italic border-border/40 shadow-inner">
                {children}
              </blockquote>
            );
          },

          // Tables
          table({ children }: any) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-border/80 shadow-md bg-surfaceHighlight/40">
                <table className="w-full border-collapse text-right text-xs sm:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }: any) {
            return (
              <thead className="bg-surfaceHighlight border-b border-border/80 text-textPrimary font-bold">
                {children}
              </thead>
            );
          },
          tbody({ children }: any) {
            return <tbody className="divide-y divide-border/40">{children}</tbody>;
          },
          tr({ children }: any) {
            return (
              <tr className="hover:bg-white/5 transition-colors odd:bg-surfaceHighlight/20">
                {children}
              </tr>
            );
          },
          th({ children }: any) {
            return (
              <th className="px-3.5 py-2.5 font-bold text-textPrimary border-x border-border/40">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td className="px-3.5 py-2.5 text-textPrimary/90 border-x border-border/30">
                {children}
              </td>
            );
          },

          // Links
          a({ href, children }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primaryHover underline underline-offset-3 font-medium inline-flex items-center gap-0.5 transition-colors"
              >
                <span>{children}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            );
          },

          // Horizontal rule
          hr() {
            return <hr className="border-t border-border/60 my-3.5" />;
          },

          // Emphasis & formatting
          strong({ children }: any) {
            return <strong className="font-bold text-textPrimary">{children}</strong>;
          },
          em({ children }: any) {
            return <em className="italic text-textSecondary">{children}</em>;
          },
          del({ children }: any) {
            return <del className="line-through text-textSecondary/70">{children}</del>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
