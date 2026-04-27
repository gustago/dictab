# dictab

Edita arquivos `.t.py` (Python record-oriented: `imports` + variáveis `list[dict]` homogêneas) como planilha estilo Excel no VSCode.

## Status

v0.0.1 — distribuído como `.vsix`. Marketplace ainda não.

## Contrato dos arquivos

Apenas arquivos terminando em `.t.py` (case-sensitive). Conteúdo permitido no toplevel:

- `import` / `from ... import ...`
- Atribuições simples ou anotadas: `x = [...]`, `x: list[dict] = [...]`
- Comentários, docstring de módulo

Cada variável deve ser `list[dict]` com **dicts homogêneos** (mesmas chaves, na mesma ordem):

```python
import pandas as pd
from datetime import date

dataset = [
    {"date": date(2024, 1, 1), "value": 1},
    {"date": date(2024, 1, 2), "value": 2},
]
```

Variável vazia preserva schema via comentário sentinela:

```python
empty = []  # dictab:cols=["a","b"]
```

Detalhes completos em `RULES.md` (no repositório fonte).

## Uso

1. Instale o `.vsix`: `code --install-extension dictab-0.0.1.vsix`
2. Abra um arquivo `.t.py` — abre no editor de código por padrão.
3. Clique em "**Abrir como Planilha**" na barra de título do editor para alternar para a visão de tabela.
4. Ctrl+S salva (volta para Python normal).

## Desenvolvimento

```bash
npm install
npm test               # vitest
npm run coverage       # gate: 100% line/func/stmt, 95% branch em src/core/**
npm run typecheck
npm run build
npm run package        # gera dictab-<version>.vsix
```

## Stack

- TypeScript estrito, sem dependências de runtime no core
- Tokenizer + parser Python custom (~700 LOC) tailored para o contrato restrito
- Vitest + c8 para testes/coverage
- VSCode Custom Text Editor + DiagnosticCollection
- Sem LSP server separado (provedores nativos do VSCode bastam pra v1)

## Licença

A definir.
