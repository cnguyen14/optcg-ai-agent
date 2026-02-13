"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ComponentPropsWithoutRef } from "react";

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="chat-markdown break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: (props: ComponentPropsWithoutRef<"h1">) => (
            <h1 className="text-lg font-bold mt-4 mb-2 text-white" {...props} />
          ),
          h2: (props: ComponentPropsWithoutRef<"h2">) => (
            <h2 className="text-base font-bold mt-3 mb-1.5 text-white" {...props} />
          ),
          h3: (props: ComponentPropsWithoutRef<"h3">) => (
            <h3 className="text-sm font-bold mt-2.5 mb-1 text-white" {...props} />
          ),

          // Paragraphs
          p: (props: ComponentPropsWithoutRef<"p">) => (
            <p className="mb-2 last:mb-0" {...props} />
          ),

          // Lists
          ul: (props: ComponentPropsWithoutRef<"ul">) => (
            <ul className="list-disc list-inside mb-2 space-y-0.5" {...props} />
          ),
          ol: (props: ComponentPropsWithoutRef<"ol">) => (
            <ol className="list-decimal list-inside mb-2 space-y-0.5" {...props} />
          ),
          li: (props: ComponentPropsWithoutRef<"li">) => (
            <li className="leading-relaxed" {...props} />
          ),

          // Code
          code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code
                  className={`block bg-black/40 rounded-lg p-3 my-2 text-xs font-mono overflow-x-auto text-emerald-300/90 ${className || ""}`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-sky-300/90"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }: ComponentPropsWithoutRef<"pre">) => (
            <pre className="my-2 overflow-x-auto" {...props}>
              {children}
            </pre>
          ),

          // Links
          a: (props: ComponentPropsWithoutRef<"a">) => (
            <a
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),

          // Blockquote
          blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
            <blockquote
              className="border-l-2 border-white/20 pl-3 my-2 text-white/60 italic"
              {...props}
            />
          ),

          // Horizontal rule
          hr: (props: ComponentPropsWithoutRef<"hr">) => (
            <hr className="border-white/10 my-3" {...props} />
          ),

          // Table
          table: (props: ComponentPropsWithoutRef<"table">) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-xs border-collapse" {...props} />
            </div>
          ),
          thead: (props: ComponentPropsWithoutRef<"thead">) => (
            <thead className="border-b border-white/20" {...props} />
          ),
          th: (props: ComponentPropsWithoutRef<"th">) => (
            <th className="text-left px-2 py-1.5 font-semibold text-white/70" {...props} />
          ),
          td: (props: ComponentPropsWithoutRef<"td">) => (
            <td className="px-2 py-1 border-t border-white/5" {...props} />
          ),

          // Strong & emphasis
          strong: (props: ComponentPropsWithoutRef<"strong">) => (
            <strong className="font-semibold text-white" {...props} />
          ),
          em: (props: ComponentPropsWithoutRef<"em">) => (
            <em className="italic text-white/80" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
