import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownMessageProps {
  content: string | null | undefined
  className?: string
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className }) => {
  if (!content) return null
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Tailwind-friendly styling for common markdown elements
          ul: (props) => <ul className="list-disc pl-5 my-2" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5 my-2" {...props} />,
          li: (props) => <li className="mb-1" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          code: (props) => <code className="bg-gray-100 px-1 rounded text-sm" {...props} />,
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-4">
              {children}
            </pre>
          ),
          p: (props) => <p className="mb-2" {...props} />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: (props) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600" {...props} />
          ),
          table: (props) => (
            <table className="border-collapse border border-gray-300 my-4" {...props} />
          ),
          th: (props) => (
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold" {...props} />
          ),
          td: (props) => (
            <td className="border border-gray-300 px-4 py-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownMessage