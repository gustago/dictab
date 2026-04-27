/**
 * Webview-side script. Runs in the VSCode webview iframe.
 * Receives state from the extension; posts mutation messages back.
 */

interface CellValue {
  source: string;
}

interface Variable {
  name: string;
  schema: string[];
  rows: CellValue[][];
}

interface FileModel {
  variables: Variable[];
}

interface State {
  model: FileModel;
  selectedVar: string | null;
  selectedRow: number | null;
  selectedCol: string | null;
}

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
};

const vscode = acquireVsCodeApi();

const state: State = {
  model: { variables: [] },
  selectedVar: null,
  selectedRow: null,
  selectedCol: null,
};

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`element not found: ${id}`);
  return el;
}

function setStatus(msg: string): void {
  $('status').textContent = msg;
}

function getCurrentVar(): Variable | null {
  if (state.selectedVar === null) return null;
  return state.model.variables.find((v) => v.name === state.selectedVar) ?? null;
}

function renderVarSelect(): void {
  const select = $('varSelect') as HTMLSelectElement;
  select.innerHTML = '';
  for (const v of state.model.variables) {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = v.name;
    select.appendChild(opt);
  }
  if (state.selectedVar !== null && state.model.variables.some((v) => v.name === state.selectedVar)) {
    select.value = state.selectedVar;
  } else if (state.model.variables.length > 0) {
    state.selectedVar = state.model.variables[0]!.name;
    select.value = state.selectedVar;
  } else {
    state.selectedVar = null;
  }
}

function renderGrid(): void {
  const grid = $('grid');
  grid.innerHTML = '';
  const v = getCurrentVar();
  if (v === null) {
    grid.textContent = 'Nenhuma variável. Clique em "+ var" para começar.';
    return;
  }
  if (v.schema.length === 0 && v.rows.length === 0) {
    grid.textContent = 'Adicione uma coluna pra começar.';
    return;
  }
  const table = document.createElement('table');
  table.className = 'dictab-grid';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  for (const col of v.schema) {
    const th = document.createElement('th');
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  if (v.rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = v.schema.length + 1;
    td.textContent = 'Sem linhas';
    td.className = 'empty-rows';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    for (let r = 0; r < v.rows.length; r++) {
      const row = v.rows[r]!;
      const tr = document.createElement('tr');
      const idx = document.createElement('td');
      idx.textContent = String(r + 1);
      idx.className = 'row-idx';
      tr.appendChild(idx);
      for (let c = 0; c < v.schema.length; c++) {
        const td = document.createElement('td');
        td.textContent = row[c]?.source ?? '';
        td.contentEditable = 'true';
        td.dataset.row = String(r);
        td.dataset.col = v.schema[c]!;
        td.addEventListener('blur', onCellBlur);
        td.addEventListener('keydown', onCellKey);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
  table.appendChild(tbody);
  grid.appendChild(table);
}

function onCellBlur(e: FocusEvent): void {
  const td = e.target as HTMLTableCellElement;
  const row = parseInt(td.dataset.row ?? '0', 10);
  const col = td.dataset.col ?? '';
  const expression = td.textContent ?? '';
  const v = getCurrentVar();
  if (!v) return;
  const original = v.rows[row]?.find((_, i) => v.schema[i] === col)?.source ?? '';
  if (expression === original) return;
  vscode.postMessage({
    kind: 'setCell',
    varName: state.selectedVar,
    rowIdx: row,
    columnName: col,
    expression,
  });
}

function onCellKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    (e.target as HTMLElement).blur();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    renderGrid();
  }
}

function bindToolbar(): void {
  const select = $('varSelect') as HTMLSelectElement;
  select.addEventListener('change', () => {
    state.selectedVar = select.value;
    renderGrid();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => onCommand(btn.dataset.cmd!));
  });
}

function onCommand(cmd: string): void {
  switch (cmd) {
    case 'addVariable': {
      const name = prompt('Nome da nova variável:');
      if (!name) return;
      vscode.postMessage({ kind: 'addVariable', name });
      break;
    }
    case 'deleteVariable': {
      if (state.selectedVar === null) return;
      if (!confirm(`Deletar variável "${state.selectedVar}"?`)) return;
      vscode.postMessage({ kind: 'deleteVariable', name: state.selectedVar });
      break;
    }
    case 'renameVariable': {
      if (state.selectedVar === null) return;
      const newName = prompt('Novo nome:', state.selectedVar);
      if (!newName || newName === state.selectedVar) return;
      vscode.postMessage({ kind: 'renameVariable', oldName: state.selectedVar, newName });
      break;
    }
    case 'addColumn': {
      if (state.selectedVar === null) return;
      const columnName = prompt('Nome da nova coluna:');
      if (!columnName) return;
      vscode.postMessage({ kind: 'addColumn', varName: state.selectedVar, columnName });
      break;
    }
    case 'removeColumn': {
      if (state.selectedVar === null) return;
      const columnName = prompt('Coluna a remover:');
      if (!columnName) return;
      vscode.postMessage({ kind: 'removeColumn', varName: state.selectedVar, columnName });
      break;
    }
    case 'renameColumn': {
      if (state.selectedVar === null) return;
      const oldName = prompt('Coluna atual:');
      if (!oldName) return;
      const newName = prompt('Novo nome:');
      if (!newName) return;
      vscode.postMessage({ kind: 'renameColumn', varName: state.selectedVar, oldName, newName });
      break;
    }
    case 'addRow': {
      if (state.selectedVar === null) return;
      vscode.postMessage({ kind: 'addRow', varName: state.selectedVar });
      break;
    }
    case 'removeRow': {
      if (state.selectedVar === null) return;
      const idx = prompt('Índice da linha (1-based):');
      if (!idx) return;
      const i = parseInt(idx, 10) - 1;
      if (Number.isNaN(i)) return;
      vscode.postMessage({ kind: 'removeRow', varName: state.selectedVar, rowIdx: i });
      break;
    }
  }
}

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg && msg.kind === 'state') {
    state.model = msg.model;
    renderVarSelect();
    renderGrid();
    setStatus(`${state.model.variables.length} variável(eis)`);
  }
});

bindToolbar();
