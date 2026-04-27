# RULES → Tests map

Cada regra de `RULES.md` mapeada para 1+ teste. Onde uma regra é puramente UI/extension/CI, está marcada como **defer** (testada em fase posterior).

## §1 Reconhecimento de arquivo
- R1.1, R1.2, R1.3, R1.4 → **defer** (extension layer)

## §2 Contrato — sintaxe toplevel
| Regra | Arquivo de teste | Bloco |
|-------|------------------|-------|
| R2.1 | `parser.spec.ts` | `§2 R2.1 — sintaxe Python inválida` |
| R2.2 | `parser.spec.ts` | `§2 R2.2 — toplevel só permite imports/atribuições/comentários/docstring` |
| R2.3 | `parser.spec.ts` | `§2 R2.3 — formas de import válidas` |
| R2.4 | `parser.spec.ts` | `§2 R2.4 — construções inválidas` (emite R2.2) |
| R2.5 | `parser.spec.ts` | `§2 R2.5 — anotação com valor` |
| R2.6 | `parser.spec.ts` | `§2 R2.6 — anotação sem valor` |
| R2.7 | `parser.spec.ts` | `§2 R2.7 — re-atribuição da mesma variável` |

## §3 Contrato — estrutura de variável
| Regra | Arquivo | Bloco |
|-------|---------|-------|
| R3.1 | `parser.spec.ts` | `§3 R3.1 — RHS deve ser list literal` |
| R3.2 | `parser.spec.ts` | `§3 R3.2 — só dict literals na lista` |
| R3.3 | `parser.spec.ts` | `§3 R3.3 — sem comprehensions/splats` |
| R3.4 | `parser.spec.ts` | `§3 R3.4 — schema homogêneo` |
| R3.5 | `parser.spec.ts` | `§3 R3.5 — chaves só string literal` |
| R3.6 | `parser.spec.ts` | `§3 R3.6 — chaves duplicadas` |
| R3.7 | `parser.spec.ts` | `§3 R3.7 — valor é qualquer expression Python válida` |
| R3.8 | `parser.spec.ts` | `§3 R3.8 — nome de variável` (cobertura via R2.1) |

## §4 Schema de colunas
| Regra | Arquivo | Bloco |
|-------|---------|-------|
| R4.1 | `parser.spec.ts` | `§4 R4.1 — schema = chaves do primeiro dict` |
| R4.2 | `parser.spec.ts` | `§4 R4.2 — sentinela em variável vazia` |
| R4.3 | `parser.spec.ts` | `§4 R4.3 — 0 linhas sem sentinela = 0 colunas` |
| R4.4 | `parser.spec.ts` | `§4 R4.4 — sentinela ignorado se há linhas` |
| R4.5 | `operations.spec.ts` | `addColumn` |
| R4.6 | `operations.spec.ts` | `removeColumn` |
| R4.7 | `operations.spec.ts` | `renameColumn` |
| R4.8 | `operations.spec.ts` | `addRow gate em 0 colunas` |

## §5 Células
| Regra | Arquivo | Bloco |
|-------|---------|-------|
| R5.1 | `parser.spec.ts` | (cell.source preserva expressão) |
| R5.2 | `operations.spec.ts` | `setCell — expressão inválida rejeitada` |
| R5.3 | `serializer.spec.ts` | `round-trip verbatim de valores` |
| R5.4 | `operations.spec.ts` | `add row/col preenche com None` |
| R5.5 | `lsp-logic.spec.ts` | `warning sobre nome não importado` |

## §6 Persistência / round-trip
| Regra | Arquivo | Bloco |
|-------|---------|-------|
| R6.1 | `serializer.spec.ts` | `determinismo — mesma model produz mesmo bytes` |
| R6.2 | `serializer.spec.ts` | `imports preservam ordem` |
| R6.3 | `serializer.spec.ts` | `variáveis preservam ordem; novas vão pro fim` |
| R6.4 | `serializer.spec.ts` | `Black-compat — inline ≤ 88 chars, expandido se > 88 ou multi-linha` |
| R6.5 | `serializer.spec.ts` | `var vazia sem schema → 'var = []'` |
| R6.6 | `serializer.spec.ts` | `var vazia com schema → sentinela JSON-like` |
| R6.7 | `serializer.spec.ts` | `comentários antes da variável preservados` |
| R6.8 | `serializer.spec.ts` | `comentários intercalados preservados` |
| R6.9 | `serializer.spec.ts` | `docstring preservada no topo` |
| R6.10 | `serializer.spec.ts` | `UTF-8, LF, newline final` |
| R6.11 | `serializer.spec.ts` | `output Black-compat (não dispara reformatação)` |

## §7 Editor — abertura/alternância → **defer** (extension layer)

## §8 UI — planilha → **defer** (webview integration)

## §9 Paste TSV
| Regra | Arquivo | Bloco |
|-------|---------|-------|
| R9.1 | `paste.spec.ts` | `parseTsv — TSV com TAB+LF e CRLF` |
| R9.2 | `paste.spec.ts` | `toPythonStringLiteral — wrap em aspas duplas` |
| R9.3 | `paste.spec.ts` | `escapes — quote, backslash, LF, CR, TAB` |
| R9.4 | `paste.spec.ts` | `applyPaste expande linhas e colunas` |
| R9.5 | `paste.spec.ts` | `applyPaste em variável 0×0` |
| R9.6 | `paste.spec.ts` | `applyPaste em variável 0 linhas × N colunas` |

## §10 LSP
| Regra | Arquivo | Bloco |
|-------|---------|-------|
| R10.1 | **defer** (server activation) | |
| R10.2 | `lsp-logic.spec.ts` | `diagnosticsFor — converte ContractError → Diagnostic` |
| R10.3 | `lsp-logic.spec.ts` | `completionsAt — sugere chaves do schema` |
| R10.4 | `lsp-logic.spec.ts` | `hoverAt — preview de até 5 valores` |
| R10.5 | `lsp-logic.spec.ts` | `não crash em modelo inválido (model=null)` |

## §11–§12 Tema/Configurações → **defer** (extension layer)

## §13 Erros
- Coberto implicitamente: cada teste de violação verifica `ruleId` + `range` no error.

## §14–§15 Build / Cobertura
- CI level (workflow YAML) — adicionado em fase posterior.
- Coverage gate configurado em `vitest.config.ts` (100% em `src/core/**`).
