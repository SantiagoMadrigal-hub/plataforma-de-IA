import type { JSONContent } from '@tiptap/core';
import MarkdownIt from 'markdown-it';

interface MarkdownSerializer {
  markdownToEditorContent: (markdown: string) => JSONContent;
  editorContentToMarkdown: (doc: JSONContent) => string;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});

function serializeNode(node: JSONContent): string {
  if (!node) return '';

  const type = node.type || 'text';
  const content = node.content;

  switch (type) {
    case 'doc':
      return serializeContent(content);

    case 'paragraph':
      return serializeContent(content) + '\n\n';

    case 'text':
      return serializeMarks(node);

    case 'heading': {
      const level = node.attrs?.level || 1;
      const prefix = '#'.repeat(level);
      return `${prefix} ${serializeContent(content).trim()}\n\n`;
    }

    case 'hardBreak':
      return '\n';

    case 'bulletList':
      return serializeListItems(content, false);

    case 'orderedList':
      return serializeListItems(content, true);

    case 'listItem':
      return serializeListItem(content);

    case 'blockquote':
      return serializeBlockquote(content);

    case 'codeBlock': {
      const language = node.attrs?.language || '';
      const code = serializeContent(content).trimEnd();
      return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    }

    case 'horizontalRule':
      return '---\n\n';

    case 'image': {
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || '';
      return `![${alt}](${src})\n\n`;
    }

    case 'taskList':
      return serializeTaskList(content);

    case 'taskItem': {
      const checked = node.attrs?.checked || false;
      const prefix = checked ? '[x] ' : '[ ] ';
      return `- ${prefix}${serializeContent(content).trim()}\n`;
    }

    default:
      return serializeContent(content);
  }
}

function serializeMarks(node: JSONContent): string {
  let text = node.text || '';

  if (node.marks) {
    for (const mark of node.marks) {
      text = applyMark(text, mark);
    }
  }

  return text;
}

function applyMark(text: string, mark: { type: string; attrs?: Record<string, unknown> }): string {
  switch (mark.type) {
    case 'bold':
      return `**${text}**`;
    case 'italic':
      return `*${text}*`;
    case 'strike':
      return `~~${text}~~`;
    case 'code':
      return `\`${text}\``;
    case 'link':
      return `[${text}](${mark.attrs?.href || ''})`;
    default:
      return text;
  }
}

function serializeContent(content?: JSONContent[]): string {
  if (!content || content.length === 0) return '';
  return content.map(serializeNode).join('');
}

function serializeListItems(content: JSONContent[] | undefined, ordered: boolean): string {
  if (!content || content.length === 0) return '';

  let result = '';
  let counter = 1;

  for (const item of content) {
    if (item.type === 'listItem') {
      const prefix = ordered ? `${counter}. ` : '- ';
      const itemContent = serializeListItemContent(item.content);
      result += `${prefix}${itemContent.trim()}\n`;
      counter++;
    } else {
      result += serializeNode(item);
    }
  }

  return result + '\n';
}

function serializeListItem(content?: JSONContent[]): string {
  return serializeListItemContent(content);
}

function serializeListItemContent(content?: JSONContent[]): string {
  if (!content || content.length === 0) return '';

  let result = '';
  for (const node of content) {
    if (node.type === 'paragraph') {
      result += serializeContent(node.content);
    } else {
      result += serializeNode(node);
    }
  }
  return result;
}

function serializeBlockquote(content?: JSONContent[]): string {
  if (!content || content.length === 0) return '';

  const inner = serializeContent(content).trim();
  const lines = inner.split('\n');
  return lines.map(line => `> ${line}`).join('\n') + '\n\n';
}

function serializeTaskList(content?: JSONContent[]): string {
  if (!content || content.length === 0) return '';

  let result = '';
  for (const item of content) {
    if (item.type === 'taskItem') {
      const checked = item.attrs?.checked || false;
      const prefix = checked ? '[x] ' : '[ ] ';
      const itemContent = serializeListItemContent(item.content);
      result += `- ${prefix}${itemContent.trim()}\n`;
    }
  }
  return result + '\n';
}

function parseInline(tokens: MarkdownIt.Token[]): JSONContent[] {
  const result: JSONContent[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'text') {
      result.push({ type: 'text', text: token.content });
    } else if (token.type === 'strong_open') {
      const closeIndex = tokens.findIndex((t, idx) => idx > i && t.type === 'strong_close');
      if (closeIndex !== -1) {
        const innerTokens = tokens.slice(i + 1, closeIndex);
        const innerContent = parseInline(innerTokens);
        result.push({
          type: 'text',
          text: innerContent.map(c => c.text || '').join(''),
          marks: [{ type: 'bold' }],
        });
        i = closeIndex;
      }
    } else if (token.type === 'em_open') {
      const closeIndex = tokens.findIndex((t, idx) => idx > i && t.type === 'em_close');
      if (closeIndex !== -1) {
        const innerTokens = tokens.slice(i + 1, closeIndex);
        const innerContent = parseInline(innerTokens);
        result.push({
          type: 'text',
          text: innerContent.map(c => c.text || '').join(''),
          marks: [{ type: 'italic' }],
        });
        i = closeIndex;
      }
    } else if (token.type === 'code_inline') {
      result.push({
        type: 'text',
        text: token.content,
        marks: [{ type: 'code' }],
      });
    } else if (token.type === 'link_open') {
      const href = token.attrGet('href') || '';
      const closeIndex = tokens.findIndex((t, idx) => idx > i && t.type === 'link_close');
      if (closeIndex !== -1) {
        const innerTokens = tokens.slice(i + 1, closeIndex);
        const innerContent = parseInline(innerTokens);
        const text = innerContent.map(c => c.text || '').join('');
        result.push({
          type: 'text',
          text,
          marks: [{ type: 'link', attrs: { href } }],
        });
        i = closeIndex;
      }
    } else if (token.type === 'image') {
      const src = token.attrGet('src') || '';
      const alt = token.content || token.children?.[0]?.content || '';
      result.push({
        type: 'image',
        attrs: { src, alt },
      });
    }
  }

  return result;
}

function parseTokens(tokens: MarkdownIt.Token[]): JSONContent[] {
  const result: JSONContent[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.replace('h', ''));
      const contentToken = tokens[i + 1];
      if (contentToken && contentToken.type === 'inline') {
        const inlineTokens = contentToken.children || [];
        const content = parseInline(inlineTokens);
        result.push({
          type: 'heading',
          attrs: { level },
          content,
        });
      }
      i += 3;
    } else if (token.type === 'paragraph_open') {
      const contentToken = tokens[i + 1];
      if (contentToken && contentToken.type === 'inline') {
        const inlineTokens = contentToken.children || [];
        const content = parseInline(inlineTokens);
        result.push({
          type: 'paragraph',
          content,
        });
      }
      i += 3;
    } else if (token.type === 'bullet_list_open') {
      const listContent: JSONContent[] = [];
      i++;
      while (i < tokens.length && tokens[i].type !== 'bullet_list_close') {
        if (tokens[i].type === 'list_item_open') {
          const itemContent: JSONContent[] = [];
          i++;
          while (i < tokens.length && tokens[i].type !== 'list_item_close') {
            if (tokens[i].type === 'paragraph_open') {
              const contentToken = tokens[i + 1];
              if (contentToken && contentToken.type === 'inline') {
                const inlineTokens = contentToken.children || [];
                const content = parseInline(inlineTokens);
                itemContent.push({
                  type: 'paragraph',
                  content,
                });
              }
              i += 3;
            } else {
              i++;
            }
          }
          listContent.push({
            type: 'listItem',
            content: itemContent,
          });
        } else {
          i++;
        }
      }
      result.push({
        type: 'bulletList',
        content: listContent,
      });
      i++;
    } else if (token.type === 'ordered_list_open') {
      const listContent: JSONContent[] = [];
      i++;
      while (i < tokens.length && tokens[i].type !== 'ordered_list_close') {
        if (tokens[i].type === 'list_item_open') {
          const itemContent: JSONContent[] = [];
          i++;
          while (i < tokens.length && tokens[i].type !== 'list_item_close') {
            if (tokens[i].type === 'paragraph_open') {
              const contentToken = tokens[i + 1];
              if (contentToken && contentToken.type === 'inline') {
                const inlineTokens = contentToken.children || [];
                const content = parseInline(inlineTokens);
                itemContent.push({
                  type: 'paragraph',
                  content,
                });
              }
              i += 3;
            } else {
              i++;
            }
          }
          listContent.push({
            type: 'listItem',
            content: itemContent,
          });
        } else {
          i++;
        }
      }
      result.push({
        type: 'orderedList',
        content: listContent,
      });
      i++;
    } else if (token.type === 'blockquote_open') {
      const quoteContent: JSONContent[] = [];
      i++;
      while (i < tokens.length && tokens[i].type !== 'blockquote_close') {
        if (tokens[i].type === 'paragraph_open') {
          const contentToken = tokens[i + 1];
          if (contentToken && contentToken.type === 'inline') {
            const inlineTokens = contentToken.children || [];
            const content = parseInline(inlineTokens);
            quoteContent.push({
              type: 'paragraph',
              content,
            });
          }
          i += 3;
        } else {
          i++;
        }
      }
      result.push({
        type: 'blockquote',
        content: quoteContent,
      });
      i++;
    } else if (token.type === 'fence') {
      result.push({
        type: 'codeBlock',
        attrs: { language: token.info || '' },
        content: [{ type: 'text', text: token.content }],
      });
      i++;
    } else if (token.type === 'hr') {
      result.push({
        type: 'horizontalRule',
      });
      i++;
    } else {
      i++;
    }
  }

  return result;
}

export const markdownSerializer: MarkdownSerializer = {
  markdownToEditorContent: (markdown: string): JSONContent => {
    try {
      const tokens = md.parse(markdown, {});
      const content = parseTokens(tokens);
      return {
        type: 'doc',
        content: content.length > 0 ? content : [{ type: 'paragraph' }],
      };
    } catch {
      return {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: markdown }],
          },
        ],
      };
    }
  },

  editorContentToMarkdown: (doc: JSONContent): string => {
    try {
      const markdown = serializeNode(doc);
      return markdown.replace(/\n{3,}/g, '\n\n').trim() + '\n';
    } catch {
      return '';
    }
  },
};
