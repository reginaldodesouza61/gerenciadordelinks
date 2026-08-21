import { GoogleGenAI } from '@google/genai';

const GEMINI_STORAGE_KEY = 'meuhub_gemini_api_key';
const GEMINI_MODEL = 'gemini-2.5-flash';

export interface DeveloperInfo {
  name: string;
  role: string;
  bio: string;
}

export const DEFAULT_DEVELOPER_INFO: DeveloperInfo = {
  name: 'Reginaldo de Souza',
  role: 'Desenvolvedor Full Stack & Arquiteto de Soluções',
  bio: 'Criador do MeuHub, focado em construir ferramentas modernas e intuitivas de produtividade, organização de recursos e desenvolvimento de software.',
};

export const SYSTEM_INFO = {
  name: 'MeuHub',
  version: '1.2.0',
  releaseDate: '2025/2026',
  description: 'Workspace integrado para desenvolvedores e profissionais gerenciarem links, cadernos de anotações interativos, documentação de requisitos, scripts com sintaxe colorida e cofre de senhas seguras.',
  features: [
    'Gestor dinâmico de links e categorias',
    'Caderno estilo OneNote com tela infinita e posicionamento livre',
    'Editor de texto rico com suporte a tabelas avançadas',
    'Blocos de código/script com realce de sintaxe e modo de execução',
    'Cofre seguro de credenciais e exportação .env',
    'Assistente de IA com Google Gemini para redação, requisitos e fluxos',
  ]
};

export function getGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setGeminiApiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    window.dispatchEvent(new CustomEvent('meuhub_gemini_key_updated'));
  } catch (err) {
    console.error('Erro ao salvar chave do Gemini:', err);
  }
}

export function removeGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('meuhub_gemini_key_updated'));
  } catch (err) {
    console.error('Erro ao remover chave do Gemini:', err);
  }
}

export async function testGeminiApiKey(key: string): Promise<{ success: boolean; message: string }> {
  if (!key || !key.trim()) {
    return { success: false, message: 'Por favor, informe uma chave de API válida.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key.trim() });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: 'Olá! Responda apenas com a palavra: OK',
    });

    if (response && response.text) {
      return { success: true, message: 'Conexão com a API do Google Gemini realizada com sucesso!' };
    }
    return { success: false, message: 'Não foi possível obter resposta da API.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { 
      success: false, 
      message: `Falha na autenticação: ${errorMsg.includes('API_KEY_INVALID') ? 'Chave de API inválida' : errorMsg}` 
    };
  }
}

export type AiActionType = 
  | 'improve_text' 
  | 'requirements_spec' 
  | 'process_flow' 
  | 'use_cases' 
  | 'convert_table' 
  | 'summarize' 
  | 'custom';

export interface AiPromptRequest {
  action: AiActionType;
  selectedText?: string;
  fullBlockText?: string;
  noteTitle?: string;
  customInstruction?: string;
}

export async function runGeminiAssistant(request: AiPromptRequest): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('CHAVE_NAO_CONFIGURADA');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Você é o assistente inteligente do MeuHub, um workspace para desenvolvedores e analistas de sistemas.
Sua missão é gerar conteúdo em HTML limpo e bem formatado pronto para ser inserido em um editor de notas (Tiptap).
REGRAS OBRIGATÓRIAS:
- Retorne EXCLUSIVAMENTE código HTML válido. Não use blocos de Markdown (\`\`\`html ou \`\`\`).
- Use tags semânticas: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <code>, <blockquote>.
- Para tabelas, use estrutura padrão: <table><thead><tr><th>Coluna 1</th><th>Coluna 2</th></tr></thead><tbody><tr><td>Dado</td><td>Dado</td></tr></tbody></table>.
- Escreva em Português do Brasil com clareza técnica, precisão e formatação impecável.`;

  let prompt = '';
  const context = request.selectedText || request.fullBlockText || '';
  const titleContext = request.noteTitle ? `Título da Nota: "${request.noteTitle}"\n\n` : '';

  switch (request.action) {
    case 'improve_text':
      prompt = `${titleContext}Melhore a redação, clareza, coesão e profissionalismo do seguinte texto, mantendo e enriquecendo o sentido original:\n\n${context}`;
      break;

    case 'requirements_spec':
      prompt = `${titleContext}A partir do seguinte rascunho/ideia, elabore um Levantamento de Requisitos completo e profissional de software:
- Objetivo e Visão Geral
- Requisitos Funcionais (RF01, RF02... com descrição detalhada)
- Requisitos Não Funcionais (RNF01, RNF02... Ex: Desempenho, Segurança, Usabilidade)
- Regras de Negócio (RN01, RN02...)
- Critérios de Aceite principais

Rascunho/Contexto:
${context || request.noteTitle || 'Novo Módulo do Sistema'}`;
      break;

    case 'process_flow':
      prompt = `${titleContext}Elabore um Fluxo de Processo passo a passo detalhado para o seguinte cenário:
1. Visão Geral e Gatilho (Trigger) do Processo
2. Entradas Necessárias (Inputs)
3. Passo a Passo do Fluxo Principal (Etapa 1, Etapa 2, Etapa 3...)
4. Desvios e Tratamento de Exceções
5. Saída Esperada (Outputs)
6. Tabela com Responsáveis e Ações

Cenário/Contexto:
${context || request.noteTitle || 'Fluxo Operacional'}`;
      break;

    case 'use_cases':
      prompt = `${titleContext}Elabore a especificação detalhada de Casos de Uso (Use Cases) para o seguinte contexto:
- Caso de Uso: Nome claro (ex: UC01 - Autenticar Usuário)
- Ator Principal e Atores Secundários
- Pré-condições
- Fluxo Principal (Caminho Feliz passo a passo numerado)
- Fluxos Alternativos e de Exceção
- Pós-condições

Contexto:
${context || request.noteTitle || 'Funcionalidade do Sistema'}`;
      break;

    case 'convert_table':
      prompt = `${titleContext}Converta as informações a seguir em uma tabela HTML muito bem estruturada com colunas organizadas e cabeçalhos claros:\n\n${context}`;
      break;

    case 'summarize':
      prompt = `${titleContext}Faça um resumo executivo objetivo em tópicos estruturados (bullet points) destacando as principais decisões, pontos de ação e informações-chave do seguinte conteúdo:\n\n${context}`;
      break;

    case 'custom':
      prompt = `${titleContext}Instrução do Usuário: ${request.customInstruction}

Conteúdo de Referência:
${context}`;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.4,
      }
    });

    let html = response.text || '';
    // Clean up if markdown code blocks were inadvertently included
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    return html;
  } catch (err: unknown) {
    console.error('Erro ao gerar com Gemini:', err);
    throw err;
  }
}

import { DrawingElement } from '@/types/notes';

export interface GeneratedDiagramResponse {
  title: string;
  elements: DrawingElement[];
  description?: string;
}

export async function generateDiagramWithAi(
  userPrompt: string, 
  noteTitle?: string
): Promise<GeneratedDiagramResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('CHAVE_NAO_CONFIGURADA');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Você é um Arquiteto de Software e Designer de Diagramas visuais do MeuHub.
Sua missão é converter a descrição do usuário em um diagrama ou fluxograma visual estruturado com elementos perfeitamente posicionados em uma grade (canvas 2D).
Retorne ESTRITAMENTE um JSON válido com o seguinte formato, sem formatação Markdown (\`\`\`json ou \`\`\`):
{
  "title": "Nome do Fluxo/Diagrama",
  "description": "Breve explicação do fluxo em 1 frase",
  "elements": [
    {
      "id": "node-1",
      "type": "rectangle" | "diamond" | "ellipse" | "cylinder" | "card" | "arrow" | "text",
      "x": 60,
      "y": 60,
      "width": 160,
      "height": 60,
      "text": "1. Início / Solicitação",
      "strokeColor": "#6366f1",
      "fillColor": "#eef2ff",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "fontSize": 13,
      "textColor": "#1e293b",
      "rounded": true
    },
    {
      "id": "arrow-1",
      "type": "arrow",
      "x": 140,
      "y": 120,
      "width": 0,
      "height": 70,
      "text": "Submete",
      "strokeColor": "#6366f1",
      "strokeWidth": 2,
      "fontSize": 11,
      "textColor": "#475569"
    }
  ]
}

REGRAS DE POSICIONAMENTO E DESIGN:
1. Posicionamento Lógico: Organize o fluxo em ordem cronológica (de cima para baixo no eixo Y, ou da esquerda para a direita no eixo X). Espaçamento padrão entre nós: ~70px a 100px.
2. Tipos de Formas:
   - "rectangle": Processos, Ações, APIs, Microsserviços (rounded: true)
   - "diamond": Decisões, Validações, Condições (Sim / Não)
   - "cylinder": Bancos de Dados, Armazenamento, Cache
   - "ellipse": Início / Fim do fluxo
   - "arrow": Setas conectando nós (x, y = ponto inicial; width = deltaX, height = deltaY). Pode incluir texto explicativo (ex: "Sim", "Não", "200 OK", "Erro").
   - "card": Anotação importante ou requisitos
3. Cores harmoniosas profissionais:
   - Início/Fim: verde (#10b981 / fill #ecfdf5)
   - Processos gerais: indigo (#6366f1 / fill #eef2ff) ou azul (#0284c7 / fill #f0f9ff)
   - Decisão/Validação: âmbar/amarelo (#d97706 / fill #fffbeb)
   - Banco de dados: roxo (#8b5cf6 / fill #f5f3ff) ou esmeralda (#059669 / fill #ecfdf5)
   - Falha/Erro: vermelho (#ef4444 / fill #fef2f2)
4. Retorne APENAS o JSON puro.`;

  const prompt = `Crie um diagrama de fluxo visual completo e profissional para o seguinte pedido:
${userPrompt}
${noteTitle ? `Contexto da anotação: "${noteTitle}"` : ''}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    let rawText = response.text || '';
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    const parsed = JSON.parse(rawText) as GeneratedDiagramResponse;
    if (parsed && Array.isArray(parsed.elements)) {
      return parsed;
    }
    throw new Error('Formato de resposta inválido');
  } catch (err) {
    console.error('Erro ao gerar diagrama com IA:', err);
    throw err;
  }
}

