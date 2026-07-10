import { describe, it, expect } from 'vitest';
import { markdownSerializer } from '../../react/src/editor/services/markdownSerializer';

describe('markdownSerializer', () => {
  describe('markdownToEditorContent', () => {
    it('should parse a simple paragraph', () => {
      const markdown = 'Hello world';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      expect(result.type).toBe('doc');
      expect(result.content).toBeDefined();
      expect(result.content?.length).toBeGreaterThan(0);
      expect(result.content?.[0].type).toBe('paragraph');
    });

    it('should parse headings', () => {
      const markdown = '# Heading 1\n\n## Heading 2\n\n### Heading 3';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      expect(result.content).toBeDefined();
      const headings = result.content?.filter(n => n.type === 'heading');
      expect(headings?.length).toBe(3);
      expect(headings?.[0].attrs?.level).toBe(1);
      expect(headings?.[1].attrs?.level).toBe(2);
      expect(headings?.[2].attrs?.level).toBe(3);
    });

    it('should parse bold text', () => {
      const markdown = '**Bold text**';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const paragraph = result.content?.[0];
      expect(paragraph?.content).toBeDefined();
      const boldNode = paragraph?.content?.find(n => 
        n.marks?.some(m => m.type === 'bold')
      );
      expect(boldNode).toBeDefined();
      expect(boldNode?.text).toBe('Bold text');
    });

    it('should parse italic text', () => {
      const markdown = '*Italic text*';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const paragraph = result.content?.[0];
      const italicNode = paragraph?.content?.find(n => 
        n.marks?.some(m => m.type === 'italic')
      );
      expect(italicNode).toBeDefined();
      expect(italicNode?.text).toBe('Italic text');
    });

    it('should parse inline code', () => {
      const markdown = '`code snippet`';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const paragraph = result.content?.[0];
      const codeNode = paragraph?.content?.find(n => 
        n.marks?.some(m => m.type === 'code')
      );
      expect(codeNode).toBeDefined();
      expect(codeNode?.text).toBe('code snippet');
    });

    it('should parse unordered lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const listNode = result.content?.find(n => n.type === 'bulletList');
      expect(listNode).toBeDefined();
      expect(listNode?.content?.length).toBe(3);
    });

    it('should parse ordered lists', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const listNode = result.content?.find(n => n.type === 'orderedList');
      expect(listNode).toBeDefined();
      expect(listNode?.content?.length).toBe(3);
    });

    it('should parse blockquotes', () => {
      const markdown = '> This is a quote';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const blockquote = result.content?.find(n => n.type === 'blockquote');
      expect(blockquote).toBeDefined();
    });

    it('should parse code blocks', () => {
      const markdown = '```\nconst x = 1;\n```';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const codeBlock = result.content?.find(n => n.type === 'codeBlock');
      expect(codeBlock).toBeDefined();
    });

    it('should parse links', () => {
      const markdown = '[Link text](https://example.com)';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const paragraph = result.content?.[0];
      const linkNode = paragraph?.content?.find(n => 
        n.marks?.some(m => m.type === 'link')
      );
      expect(linkNode).toBeDefined();
      const linkMark = linkNode?.marks?.find(m => m.type === 'link');
      expect(linkMark?.attrs?.href).toBe('https://example.com');
    });

    it('should parse images', () => {
      const markdown = '![Alt text](https://example.com/image.png)';
      const result = markdownSerializer.markdownToEditorContent(markdown);
      
      const paragraph = result.content?.[0];
      expect(paragraph?.type).toBe('paragraph');
      const imageNode = paragraph?.content?.find(n => n.type === 'image');
      expect(imageNode).toBeDefined();
      expect(imageNode?.attrs?.src).toBe('https://example.com/image.png');
      expect(imageNode?.attrs?.alt).toBe('Alt text');
    });

    it('should handle empty input', () => {
      const result = markdownSerializer.markdownToEditorContent('');
      expect(result.type).toBe('doc');
      expect(result.content).toBeDefined();
    });
  });

  describe('editorContentToMarkdown', () => {
    it('should serialize a paragraph', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('Hello world');
    });

    it('should serialize headings', () => {
      const doc = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Subtitle' }] },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('# Title');
      expect(markdown).toContain('## Subtitle');
    });

    it('should serialize bold text', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
            ],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('**Bold**');
    });

    it('should serialize italic text', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Italic', marks: [{ type: 'italic' }] },
            ],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('*Italic*');
    });

    it('should serialize inline code', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'code', marks: [{ type: 'code' }] },
            ],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('`code`');
    });

    it('should serialize bullet lists', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }] },
            ],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('- Item 1');
      expect(markdown).toContain('- Item 2');
    });

    it('should serialize ordered lists', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
            ],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('1. First');
      expect(markdown).toContain('2. Second');
    });

    it('should serialize blockquotes', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Quoted text' }] },
            ],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('> Quoted text');
    });

    it('should serialize code blocks', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'javascript' },
            content: [{ type: 'text', text: 'const x = 1;' }],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('const x = 1;');
    });

    it('should serialize links', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Link',
                marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
              },
            ],
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('[Link](https://example.com)');
    });

    it('should serialize images', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: { src: 'https://example.com/image.png', alt: 'Alt text' },
          },
        ],
      };
      
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toContain('![Alt text](https://example.com/image.png)');
    });

    it('should handle empty document', () => {
      const doc = { type: 'doc', content: [] };
      const markdown = markdownSerializer.editorContentToMarkdown(doc);
      expect(markdown).toBeDefined();
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve bold text through round-trip', () => {
      const original = '**Bold text**';
      const parsed = markdownSerializer.markdownToEditorContent(original);
      const serialized = markdownSerializer.editorContentToMarkdown(parsed);
      expect(serialized).toContain('**Bold text**');
    });

    it('should preserve italic text through round-trip', () => {
      const original = '*Italic text*';
      const parsed = markdownSerializer.markdownToEditorContent(original);
      const serialized = markdownSerializer.editorContentToMarkdown(parsed);
      expect(serialized).toContain('*Italic text*');
    });

    it('should preserve headings through round-trip', () => {
      const original = '# Heading 1\n\n## Heading 2\n\n### Heading 3';
      const parsed = markdownSerializer.markdownToEditorContent(original);
      const serialized = markdownSerializer.editorContentToMarkdown(parsed);
      expect(serialized).toContain('# Heading 1');
      expect(serialized).toContain('## Heading 2');
      expect(serialized).toContain('### Heading 3');
    });

    it('should preserve lists through round-trip', () => {
      const original = '- Item 1\n- Item 2\n- Item 3';
      const parsed = markdownSerializer.markdownToEditorContent(original);
      const serialized = markdownSerializer.editorContentToMarkdown(parsed);
      expect(serialized).toContain('- Item 1');
      expect(serialized).toContain('- Item 2');
      expect(serialized).toContain('- Item 3');
    });

    it('should preserve blockquotes through round-trip', () => {
      const original = '> Quoted text';
      const parsed = markdownSerializer.markdownToEditorContent(original);
      const serialized = markdownSerializer.editorContentToMarkdown(parsed);
      expect(serialized).toContain('> Quoted text');
    });

    it('should preserve code blocks through round-trip', () => {
      const original = '```\nconst x = 1;\n```';
      const parsed = markdownSerializer.markdownToEditorContent(original);
      const serialized = markdownSerializer.editorContentToMarkdown(parsed);
      expect(serialized).toContain('```');
      expect(serialized).toContain('const x = 1;');
    });

    it('should preserve inline code through round-trip', () => {
      const original = '`code snippet`';
      const parsed = markdownSerializer.markdownToEditorContent(original);
      const serialized = markdownSerializer.editorContentToMarkdown(parsed);
      expect(serialized).toContain('`code snippet`');
    });

    it('should preserve links through round-trip', () => {
      const original = '[Link text](https://example.com)';
      const parsed = markdownSerializer.markdownToEditorContent(original);
      const serialized = markdownSerializer.editorContentToMarkdown(parsed);
      expect(serialized).toContain('[Link text](https://example.com)');
    });
  });
});
