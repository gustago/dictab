# dictab — Regras (v0)

> Documento normativo. Cada regra (`R<seção>.<n>`) é a unidade de teste mínima.
> Mudanças aqui exigem revisão **antes** de qualquer ajuste em testes ou código.

## 0. Glossário

- **`.t.py`** — arquivo-alvo da extensão; é Python sintaticamente válido.
- **Contrato** — conjunto de regras que um `.t.py` deve satisfazer pra ser editável pela extensão.
- **Variável** — nome no toplevel atribuído a um list literal de dict literals.
- **Schema** — sequência ordenada de chaves dos dicts de uma variável.
- **Sentinela** — comentário `# dictab:cols=[...]` que persiste schema quando há 0 linhas.
- **Modelo** — representação em memória do conteúdo do arquivo (lista de variáveis com schema e linhas).
- **Source** — o texto Python no arquivo.

## 1. Reconhecimento de arquivo

- **R1.1** A extensão ativa para arquivos cujo nome termina em `.t.py` (case-sensitive, sufixo exato).
- **R1.2** `foo.py` (sem `.t.`) não ativa.
- **R1.3** `foo.T.py`, `foo.t.PY`, `foo.t.py.bak` não ativam.
- **R1.4** `foo.t.py` continua sendo Python válido em runtime; o `.t.` é convenção de naming reconhecida pela extensão, não pelo Python.

## 2. Contrato — sintaxe toplevel

- **R2.1** O arquivo deve parsear como Python (sem erros sintáticos).
- **R2.2** Toplevel só aceita: imports, atribuições simples, comentários, e (opcional) docstring de módulo na primeira posição.
- **R2.3** Imports válidos: `import X`, `import X as Y`, `from X import Y`, `from X import Y as Z`, com múltiplos nomes vírgula-separados, parêntesis multi-linha permitidos.
- **R2.4** São **inválidos** no toplevel: `def`, `class`, `if`, `for`, `while`, `try`, `with`, `match`, `raise`, `return`, expressões soltas (exceto a docstring inicial), `+=` e demais aug-assign, atribuições múltiplas (`a = b = …`), unpacking (`a, b = …`), `del`, `global`, `nonlocal`, `async`.
- **R2.5** Anotação **com** valor é permitida (`x: list[dict] = [...]`); a anotação é preservada verbatim mas ignorada semanticamente.
- **R2.6** Anotação **sem** valor (`x: int`) é inválida.
- **R2.7** Cada nome de variável só pode ser atribuído uma vez no arquivo. Re-atribuição → inválido.

## 3. Contrato — estrutura de variável

- **R3.1** O valor atribuído deve ser um list literal `[...]`.
- **R3.2** A lista deve conter apenas dict literals `{...}`, ou estar vazia.
- **R3.3** Comprehensions, generators, splats (`*x`), unpacking de dict (`**x`) → inválido.
- **R3.4** Todos os dicts da lista devem ter o **mesmo conjunto ordenado** de chaves.
- **R3.5** Chaves devem ser string literals — qualquer forma cujo AST reduza a `Constant(value: str)` (incluindo concatenação implícita `"a" "b"`). f-strings, bytes, números, tuplas, expressões → inválido.
- **R3.6** Chaves duplicadas dentro do mesmo dict → inválido.
- **R3.7** Valores dos dicts: **qualquer expressão Python sintaticamente válida** (literais, calls, atributos, indexação, lambdas, ternários, comprehensions). Não é avaliada — só parseada.
- **R3.8** Nome da variável: identificador Python válido. `_x` permitido. Dunders (`__x__`) permitidos.

## 4. Schema de colunas

- **R4.1** Variável com ≥1 linha: schema = chaves do primeiro dict (ordem preservada). R3.4 garante consistência com os demais.
- **R4.2** Variável com 0 linhas e sentinela na mesma linha do `[]`: schema = lista do sentinela.
- **R4.3** Variável com 0 linhas e sem sentinela: schema vazio (0 colunas).
- **R4.4** Sentinela em variável com ≥1 linha: ignorado pela leitura; **removido** pela serialização (linhas mandam).
- **R4.5** Adicionar coluna `c` em variável com N linhas: insere chave `c` em todos os dicts com valor default `None`. Posição: fim do schema. Falha se `c` já existe.
- **R4.6** Remover coluna `c`: remove `c` de todos os dicts. Falha se `c` não existe.
- **R4.7** Renomear coluna `a` → `b`: renomeia em todos os dicts, preservando posição. Falha se `b` já existe ou `a` não existe.
- **R4.8** Adicionar linha em variável com 0 colunas: proibido (R8.5). Modelo nunca aceita.

## 5. Células — valores

- **R5.1** O conteúdo editável da célula é a expressão Python source que produz o valor.
- **R5.2** A expressão deve ser sintaticamente válida como expression (`ast.parse(expr, mode="eval")`).
- **R5.3** Round-trip do source da célula: **verbatim** — os bytes do arquivo preservam o que está no modelo, e o modelo preserva o que o usuário digita.
- **R5.4** Default ao adicionar coluna ou linha em todas as células novas: o literal `None`.
- **R5.5** Célula que referencia nome não importado: válida no nível de contrato (não avaliamos), mas LSP marca como warning (R10.2).

## 6. Persistência — round-trip

- **R6.1** Saída determinística: dado o mesmo modelo, o serializador produz o mesmo source byte-a-byte.
- **R6.2** Ordem dos imports: preservada conforme leitura.
- **R6.3** Ordem das variáveis: preservada conforme leitura. Variáveis novas vão pro fim do arquivo.
- **R6.4** Estilo de variável **não vazia** — Black-compatible (line-length 88, magic trailing comma):
  - Lista sempre expandida com **magic trailing comma** (Black respeita).
  - 4 espaços de indentação.
  - Cada dict em sua própria linha. Se o dict couber em ≤ 88 chars (incluindo a indentação e a vírgula final), permanece **inline**:
    ```python
    var = [
        {"a": 1, "b": 2},
        {"a": 3, "b": 4},
    ]
    ```
  - Se o dict exceder 88 chars **ou** contiver valor multi-linha, é **expandido** verticalmente com trailing comma:
    ```python
    var = [
        {
            "long_key_a": pd.Timestamp("2024-01-01", tz="America/Sao_Paulo"),
            "long_key_b": 2,
        },
    ]
    ```
  - **Leitura é tolerante**: aceita qualquer formato sintaticamente válido (Black colapsado, Black expandido, ou intermediário). Serialização normaliza para o estilo acima.
- **R6.5** Estilo de variável **vazia sem schema**: `var = []`.
- **R6.6** Estilo de variável **vazia com schema**: `var = []  # dictab:cols=["a","b"]` (chaves entre aspas duplas; lista JSON-like; exatamente dois espaços antes do `#`).
- **R6.7** Comentários do usuário **imediatamente antes** de uma variável: preservados imediatamente antes do bloco da variável na saída.
- **R6.8** Comentários em outras posições (entre imports, fim do arquivo): preservados na posição relativa (best-effort baseado na linha-âncora mais próxima).
- **R6.9** Docstring de módulo: preservada verbatim no topo.
- **R6.10** Encoding UTF-8; line ending `\n`; arquivo termina com newline.
- **R6.11** **Black-compat**: dictab não invoca Black; produz output Black-compatible (line-length 88, magic trailing comma, double quotes — já cobertos por R6.4 e R6.6). Rodar Black em um `.t.py` salvo pelo dictab é no-op. Em v1 line-length é fixo em 88; configs customizadas (ex.: 100) ficam para v2 lendo `pyproject.toml [tool.black]`.

## 7. Editor — abertura e alternância

- **R7.1** Ao abrir `.t.py`, o editor de texto Python padrão é usado.
- **R7.2** Comando `dictab.openSpreadsheet` registrado; aparece como botão na editor title bar **somente** em `.t.py`.
- **R7.3** Executar `dictab.openSpreadsheet` em arquivo válido: abre o custom editor "dictab" no mesmo grupo, substituindo a aba.
- **R7.4** Executar em arquivo inválido: `showErrorMessage` com a primeira violação (rule id + linha + coluna); planilha não abre.
- **R7.5** Comando `dictab.openSource` (no custom editor): volta para o editor de texto.
- **R7.6** Edição externa do arquivo enquanto a planilha está aberta: planilha detecta e oferece "Reload" (descarta edits não salvos da UI) ou "Keep" (mantém modelo em memória, marca dirty).

## 8. UI — planilha

- **R8.1** Header: dropdown "Variável" listando os nomes na ordem de declaração.
- **R8.2** Toolbar com botões: nova var, deletar var, +linha, -linha, +coluna, -coluna, renomear coluna, renomear var.
- **R8.3** Variável 0×0: grid sem cabeçalho/linhas; mensagem "Adicione uma coluna pra começar".
- **R8.4** Variável 0 linhas × N colunas: cabeçalho de colunas; corpo vazio com mensagem "Sem linhas".
- **R8.5** Botão "+linha" desabilitado quando a var atual tem 0 colunas.
- **R8.6** Edição inline: clique → input com a expressão atual; Enter ou blur → commit; Esc → cancela.
- **R8.7** Expressão inválida no commit: borda vermelha + tooltip com mensagem do parser; modelo **não** é alterado; usuário precisa corrigir ou cancelar.
- **R8.8** Renomear coluna/var: prompt nativo do VSCode; valida (identificador Python pra var; string não-vazia distinta pra coluna); falha → `showErrorMessage`.
- **R8.9** Salvamento: a planilha edita o `TextDocument` subjacente; save segue o ciclo normal do VSCode (Ctrl+S, dirty indicator).
- **R8.10** Deletar var atual: prompt de confirmação; depois seleciona a primeira var restante (ou estado "nenhuma var").

## 9. Paste do Excel (clipboard TSV)

- **R9.1** Clipboard com formato TSV (TAB + LF/CRLF) é detectado em paste sobre uma célula.
- **R9.2** Cada célula colada vira **string literal Python**: `"valor"`. Sem inferência de tipo.
- **R9.3** Escapes na string literal gerada: `"` → `\"`, `\` → `\\`, LF interno → `\n`, CR interno → `\r`, TAB interno → `\t`.
- **R9.4** Paste excedendo o range existente expande linhas e colunas. Colunas novas são auto-nomeadas `col_N` onde N = índice 1-based da nova coluna.
- **R9.5** Paste em variável 0×0: cria colunas auto-nomeadas + linhas correspondentes.
- **R9.6** Paste em variável 0 linhas × N colunas: cria linhas; usa as colunas existentes (se M ≤ N), ou expande à direita (se M > N).

## 10. LSP

- **R10.1** Server roda em `.t.py` (matching: documentSelector pattern `**/*.t.py`).
- **R10.2** Diagnostics emitidos:
  - Erro de sintaxe Python (R2.1).
  - Violações específicas de R2/R3/R4 com `range` preciso e rule id na mensagem.
  - Sentinela malformado.
  - Referência a nome não importado em valor de célula → severity `Warning`.
- **R10.3** Autocomplete dentro de dict literal: sugere chaves já presentes em outros dicts da mesma var.
- **R10.4** Hover sobre uma chave: tooltip com até 5 valores correspondentes nas outras linhas (preview).
- **R10.5** LSP funciona em arquivos inválidos — emite os diagnostics, não dá crash.

## 11. Tema

- **R11.1** Setting `dictab.theme`: `"auto"` (default), `"light"`, `"dark"`.
- **R11.2** Em `auto`, a planilha usa CSS variables `--vscode-*` e responde a mudanças de tema do VSCode.
- **R11.3** Em `light`/`dark`, palettes embutidas, ignorando o tema do VSCode.

## 12. Configurações

- **R12.1** `dictab.theme`: ver §11.
- **R12.2** Sem outras settings em v1.

## 13. Erros e validações

- **R13.1** Toda violação de contrato vira diagnostic LSP com `range` preciso e mensagem em pt-BR contendo o rule id (ex.: "[R3.4] dicts com chaves divergentes").
- **R13.2** Comandos da extensão exibem `vscode.window.showErrorMessage` ao falhar precondição.
- **R13.3** Operações da UI são gates: se o resultado violaria o contrato, a operação falha com mensagem clara **antes** de mexer no documento.

## 14. Build / Distribuição

- **R14.1** `npm run package` produz `dictab-<version>.vsix` via `vsce package`.
- **R14.2** GitHub Actions: lint, type-check, tests, coverage gate, package — em PR e push pra `main`.
- **R14.3** Marketplace publish: deferido (ver memory `reference_marketplace.md`).

## 15. Cobertura

- **R15.1** 100% line + function + statement em `src/core/**` (parser, model, serializer, validator, paste, LSP logic); branch ≥ 95% (relaxado pra acomodar checks defensivos `?.`/`??` de invariantes). Falha de CI se abaixo do gate.
- **R15.2** `src/webview/**` e `src/extension.ts`: smoke tests via `@vscode/test-electron`; sem mínimo formal de cobertura.
- **R15.3** Tooling: `c8` integrado ao Vitest; relatório consolidado em `coverage/`.

---

**Próximo passo (após aprovação):** transformar cada R em 1+ teste failing em `tests/<area>.spec.ts`, com mapeamento documentado em `tests/RULES_MAP.md`.
