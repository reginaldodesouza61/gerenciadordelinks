import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { UMLDiagramComponent } from './UMLDiagramComponent';

export const UMLDiagramExtension = Node.create({
  name: 'umlDiagram',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      nodes: {
        default: [],
        parseHTML: element => {
          const attr = element.getAttribute('data-nodes');
          return attr ? JSON.parse(attr) : [];
        },
        renderHTML: attributes => {
          if (!attributes.nodes) return {};
          return { 'data-nodes': JSON.stringify(attributes.nodes) };
        },
      },
      edges: {
        default: [],
        parseHTML: element => {
          const attr = element.getAttribute('data-edges');
          return attr ? JSON.parse(attr) : [];
        },
        renderHTML: attributes => {
          if (!attributes.edges) return {};
          return { 'data-edges': JSON.stringify(attributes.edges) };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="uml-diagram"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'uml-diagram' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UMLDiagramComponent);
  },
});
