"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Renders markdown with the Aria chatbot look (bold labels, diamond bullets,
 * numbered badges) so raw symbols like ** and ### never show to the user.
 */
export function AriaMarkdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`aria-markdown ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>

      <style jsx global>{`
        .aria-markdown p {
          margin-bottom: 0.5rem;
        }
        .aria-markdown p:last-child {
          margin-bottom: 0;
        }
        .aria-markdown strong {
          font-weight: 700;
          color: #1e293b;
        }
        .aria-markdown em {
          font-style: italic;
          color: #475569;
        }
        .aria-markdown ul {
          list-style: none;
          padding-left: 0;
          margin: 0.5rem 0;
        }
        .aria-markdown ul li {
          position: relative;
          padding-left: 1.25rem;
          margin-bottom: 0.35rem;
          line-height: 1.5;
        }
        .aria-markdown ul li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.55em;
          width: 6px;
          height: 6px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-radius: 2px;
          transform: rotate(45deg);
        }
        .aria-markdown ol {
          list-style: none;
          padding-left: 0;
          margin: 0.5rem 0;
          counter-reset: aria-counter;
        }
        .aria-markdown ol li {
          position: relative;
          padding-left: 2rem;
          margin-bottom: 0.5rem;
          line-height: 1.5;
          counter-increment: aria-counter;
        }
        .aria-markdown ol li::before {
          content: counter(aria-counter);
          position: absolute;
          left: 0;
          top: 0;
          width: 1.4rem;
          height: 1.4rem;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
        }
        .aria-markdown table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 0.75rem 0;
          font-size: 0.75rem;
          border-radius: 0.5rem;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .aria-markdown thead th {
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          padding: 0.5rem 0.75rem;
          text-align: left;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #cbd5e1;
        }
        .aria-markdown tbody td {
          padding: 0.45rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          color: #475569;
        }
        .aria-markdown tbody tr:last-child td {
          border-bottom: none;
        }
        .aria-markdown tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .aria-markdown tbody tr:hover {
          background-color: #eef2ff;
        }
        .aria-markdown code {
          background: #f1f5f9;
          padding: 0.15rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.8em;
          font-family: ui-monospace, monospace;
          color: #6366f1;
          font-weight: 600;
        }
        .aria-markdown pre {
          background: #1e293b;
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin: 0.5rem 0;
          overflow-x: auto;
        }
        .aria-markdown pre code {
          background: none;
          padding: 0;
          color: #e2e8f0;
          font-weight: 400;
        }
        .aria-markdown hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 0.75rem 0;
        }
        .aria-markdown blockquote {
          border-left: 3px solid #818cf8;
          padding-left: 0.75rem;
          margin: 0.5rem 0;
          color: #64748b;
          font-style: italic;
        }
        .aria-markdown h1,
        .aria-markdown h2,
        .aria-markdown h3 {
          font-weight: 800;
          color: #1e293b;
          margin: 0.75rem 0 0.25rem;
        }
        .aria-markdown h1 { font-size: 1rem; }
        .aria-markdown h2 { font-size: 0.9rem; }
        .aria-markdown h3 { font-size: 0.85rem; }
      `}</style>
    </div>
  )
}
