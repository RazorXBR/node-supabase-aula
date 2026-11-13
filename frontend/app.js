const tabela = document.getElementById('tabela-alunos');
const tabelaCursos = document.getElementById('tabela-cursos');
const msg = document.getElementById('msg');
const modal = document.getElementById('modal');
const modalTitulo = document.getElementById('modal-titulo');
const form = document.getElementById('form-aluno');
const inputNome = document.getElementById('nome');
const inputRa = document.getElementById('ra');
const selectCurso = document.getElementById('curso');
const filtroCurso = document.getElementById('filtro-curso');
const formCurso = document.getElementById('form-curso');
const inputNovoCurso = document.getElementById('novo-curso');

// Elementos de Rolagem e Busca e Filtros Ativos
const alunosStatus = document.getElementById('alunos-status');
const sentinelaAlunos = document.getElementById('sentinela-alunos');
const formBusca = document.getElementById('form-busca');
const inputBusca = document.getElementById('busca-aluno');
const filtrosAtivos = document.getElementById('filtros-ativos');
const thBotoesOrdem = document.querySelectorAll('.th-ordem');

let modo = 'criar';
let raEditando = '';

// Memória da lista (paginação, busca e ordenação)
const ALUNOS_POR_PAGINA = 5;
let alunosInicio = 0;
let alunosTotal = 0;
let alunosTemMais = false;
let alunosCarregando = false;
let alunosErro = false;
let alunosPedido = 0;

let alunosBusca = '';
let alunosOrdem = '';
let alunosDirecao = 'asc';

function mostrarMsg(texto, tipo = '') {
  msg.hidden = false;
  msg.textContent = texto;
  msg.className = 'msg' + (tipo ? ` ${tipo}` : '');
}

// ==================== CURSOS ====================
async function listarCursos() {
  const resposta = await fetch('/cursos');
  const cursos = await resposta.json();
  if (!resposta.ok) {
    mostrarMsg(cursos.erro || 'Erro ao listar cursos', 'erro');
    return;
  }
  montarTabelaCursos(cursos);
  preencherSelects(cursos);
}

function montarTabelaCursos(cursos) {
  if (!cursos.length) {
    tabelaCursos.innerHTML = '<tr><td colspan="3" class="vazio">Nenhum curso cadastrado ainda.</td></tr>';
    return;
  }
  tabelaCursos.innerHTML = '';
  for (const curso of cursos) {
    const tr = document.createElement('tr');
    
    const tdNome = document.createElement('td');
    tdNome.textContent = curso.nome;
    const tdTotal = document.createElement('td');
    tdTotal.textContent = curso.total_alunos;
    const tdAcoes = document.createElement('td');
    
    const btnVer = document.createElement('button');
    btnVer.textContent = 'Ver alunos';
    btnVer.className = 'btn btn-secundario btn-pequeno';
    btnVer.onclick = () => {
      filtroCurso.value = curso.id;
      atualizarFiltrosAtivos();
      listarAlunos(false);
    };
    
    const btnExcluir = document.createElement('button');
    btnExcluir.textContent = 'Excluir';
    btnExcluir.className = 'btn btn-perigo btn-pequeno';
    btnExcluir.onclick = () => excluirCurso(curso.id, curso.nome);
    
    tdAcoes.appendChild(btnVer);
    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdNome);
    tr.appendChild(tdTotal);
    tr.appendChild(tdAcoes);
    tabelaCursos.appendChild(tr);
  }
}

function preencherSelects(cursos) {
  const filtroAtual = filtroCurso.value;
  const cursoAtual = selectCurso.value;
  filtroCurso.innerHTML = '<option value="">Todos os cursos</option>';
  selectCurso.innerHTML = '<option value="">Selecione um curso</option>';
  for (const curso of cursos) {
    filtroCurso.appendChild(new Option(curso.nome, curso.id));
    selectCurso.appendChild(new Option(curso.nome, curso.id));
  }
  filtroCurso.value = filtroAtual;
  selectCurso.value = cursoAtual;
  if (filtroCurso.selectedIndex === -1) filtroCurso.value = '';
  if (selectCurso.selectedIndex === -1) selectCurso.value = '';
}

async function adicionarCurso(evento) {
  evento.preventDefault();
  const nome = inputNovoCurso.value.trim();
  const resposta = await fetch('/cursos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),
  });
  const dados = await resposta.json();
  if (!resposta.ok) {
    mostrarMsg(dados.erro || 'Erro ao cadastrar curso', 'erro');
    return;
  }
  inputNovoCurso.value = '';
  mostrarMsg(`Curso "${dados.nome}" cadastrado!`, 'ok');
  listarCursos();
}

async function excluirCurso(id, nome) {
  if (!confirm(`Excluir o curso "${nome}"?`)) return;
  const resposta = await fetch('/cursos/' + id, { method: 'DELETE' });
  const dados = await resposta.json();
  if (!resposta.ok) {
    mostrarMsg(dados.erro || 'Erro ao excluir curso', 'erro');
    return;
  }
  mostrarMsg('Curso excluído.', 'ok');
  atualizarTudo();
}

// ==================== ALUNOS E GRID DINÂMICO ====================

function abrirModalCriar() {
  if (selectCurso.options.length <= 1) {
    mostrarMsg('Cadastre um curso antes de incluir alunos.', 'erro');
    return;
  }
  modo = 'criar';
  raEditando = '';
  modalTitulo.textContent = 'Novo aluno';
  form.reset();
  selectCurso.value = filtroCurso.value;
  inputRa.disabled = false;
  modal.hidden = false;
  inputNome.focus();
}

function abrirModalEditar(aluno) {
  modo = 'editar';
  raEditando = aluno.ra;
  modalTitulo.textContent = 'Editar aluno';
  inputNome.value = aluno.nome || '';
  inputRa.value = aluno.ra || '';
  selectCurso.value = aluno.curso_id;
  inputRa.disabled = true;
  modal.hidden = false;
  inputNome.focus();
}

function fecharModal() {
  modal.hidden = true;
  form.reset();
  inputRa.disabled = false;
}

function linhaAluno(aluno) {
  const tr = document.createElement('tr');
  const tdNome = document.createElement('td');
  tdNome.textContent = aluno.nome;
  const tdRa = document.createElement('td');
  tdRa.textContent = aluno.ra;
  const tdCurso = document.createElement('td');
  tdCurso.textContent = aluno.curso ? aluno.curso.nome : '-';
  const tdAcoes = document.createElement('td');

  const btnEditar = document.createElement('button');
  btnEditar.textContent = 'Editar';
  btnEditar.className = 'btn btn-secundario btn-pequeno';
  btnEditar.onclick = () => abrirModalEditar(aluno);

  const btnExcluir = document.createElement('button');
  btnExcluir.textContent = 'Excluir';
  btnExcluir.className = 'btn btn-perigo btn-pequeno';
  btnExcluir.onclick = () => excluirAluno(aluno.ra, aluno.nome);

  tdAcoes.appendChild(btnEditar);
  tdAcoes.appendChild(btnExcluir);
  tr.appendChild(tdNome);
  tr.appendChild(tdRa);
  tr.appendChild(tdCurso);
  tr.appendChild(tdAcoes);
  return tr;
}

// ==== BUSCA E NUVENS ====
function pesquisarAlunos(evento) {
  evento.preventDefault();
  alunosBusca = inputBusca.value.trim();
  atualizarFiltrosAtivos();
  listarAlunos(false);
}

function limparBusca() {
  inputBusca.value = '';
  alunosBusca = '';
  atualizarFiltrosAtivos();
  listarAlunos(false);
}

function limparFiltroCurso() {
  filtroCurso.value = '';
  atualizarFiltrosAtivos();
  listarAlunos(false);
}

function nomeCursoDoFiltro() {
  const option = filtroCurso.options[filtroCurso.selectedIndex];
  return option ? option.text : '';
}

function criarNuvemFiltro(texto, funcaoLimpar, tituloAcessibilidade) {
  const div = document.createElement('div');
  div.className = 'nuvem-filtro';
  
  const span = document.createElement('span');
  span.className = 'nuvem-filtro-texto';
  span.textContent = texto;
  
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nuvem-filtro-limpar';
  btn.textContent = 'x';
  btn.title = tituloAcessibilidade;
  btn.onclick = funcaoLimpar;

  div.appendChild(span);
  div.appendChild(btn);
  return div;
}

function atualizarFiltrosAtivos() {
  filtrosAtivos.innerHTML = '';
  const temBusca = Boolean(alunosBusca);
  const temCurso = Boolean(filtroCurso.value);

  if (!temBusca && !temCurso) {
    filtrosAtivos.hidden = true;
    return;
  }

  if (temCurso) {
    filtrosAtivos.appendChild(
      criarNuvemFiltro(`Curso: ${nomeCursoDoFiltro()}`, limparFiltroCurso, 'Limpar filtro de curso')
    );
  }
  if (temBusca) {
    filtrosAtivos.appendChild(
      criarNuvemFiltro(`Pesquisa: ${alunosBusca}`, limparBusca, 'Limpar pesquisa')
    );
  }
  filtrosAtivos.hidden = false;
}

// ==== ORDENAÇÃO ====
function ordenarPorColuna(coluna) {
  if (alunosOrdem === coluna) {
    alunosDirecao = alunosDirecao === 'asc' ? 'desc' : 'asc';
  } else {
    alunosOrdem = coluna;
    alunosDirecao = 'asc';
  }
  atualizarCabecalhosOrdem();
  listarAlunos(false);
}

function atualizarCabecalhosOrdem() {
  thBotoesOrdem.forEach(btn => {
    btn.classList.remove('ativa');
    const seta = btn.querySelector('.seta-ordem');
    seta.textContent = '';
    
    if (btn.dataset.ordem === alunosOrdem) {
      btn.classList.add('ativa');
      seta.textContent = alunosDirecao === 'asc' ? '↑' : '↓';
    }
  });
}

// ==== LISTAGEM COM PARÂMETROS ====
async function listarAlunos(acrescentar = false) {
  if (acrescentar && (alunosCarregando || !alunosTemMais)) return;

  const pedido = acrescentar ? alunosPedido : ++alunosPedido;
  const inicio = acrescentar ? alunosInicio : 0;
  alunosCarregando = true;
  alunosErro = false;

  if (!acrescentar) {
    tabela.innerHTML = '<tr><td colspan="4" class="vazio">Carregando...</td></tr>';
    alunosStatus.textContent = 'Carregando...';
  } else {
    alunosStatus.textContent = `Mostrando ${alunosInicio} de ${alunosTotal}. Carregando mais...`;
  }

  try {
    const cursoId = filtroCurso.value;
    const base = cursoId ? `/cursos/${cursoId}/alunos` : '/alunos';
    
    const params = new URLSearchParams({
      inicio: String(inicio),
      limite: String(ALUNOS_POR_PAGINA),
    });
    if (alunosBusca) params.set('busca', alunosBusca);
    if (alunosOrdem) {
      params.set('ordem', alunosOrdem);
      params.set('direcao', alunosDirecao);
    }

    const resposta = await fetch(`${base}?${params.toString()}`);
    const dados = await resposta.json();

    if (pedido !== alunosPedido) return;
    if (!resposta.ok) throw new Error(dados.erro || 'Erro ao listar alunos');

    const alunos = dados.alunos || [];
    alunosTotal = dados.total || 0;

    if (!acrescentar) tabela.innerHTML = '';

    if (!alunosTotal) {
      tabela.innerHTML = '<tr><td colspan="4" class="vazio">Nenhum aluno encontrado.</td></tr>';
      alunosTemMais = false;
      alunosStatus.textContent = 'Nenhum aluno para mostrar.';
      return;
    }

    for (const aluno of alunos) {
      tabela.appendChild(linhaAluno(aluno));
    }

    alunosInicio = inicio + alunos.length;
    alunosTemMais = alunosInicio < alunosTotal;

    if (alunosTemMais) {
      alunosStatus.textContent = `Mostrando ${alunosInicio} de ${alunosTotal}. Role a tela para carregar mais.`;
    } else {
      alunosStatus.textContent = `Mostrando ${alunosTotal} de ${alunosTotal}. Fim da lista.`;
    }

  } catch (erro) {
    if (pedido !== alunosPedido) return;
    alunosErro = true;
    mostrarMsg(erro.message, 'erro');
    if (!acrescentar) {
      tabela.innerHTML = '<tr><td colspan="4" class="vazio">Não foi possível carregar a lista.</td></tr>';
    }
    alunosStatus.textContent = 'A lista não carregou. Use Atualizar lista para tentar de novo.';
  } finally {
    if (pedido === alunosPedido) {
      alunosCarregando = false;
      pedirMaisSeVisivel();
    }
  }
}

function pedirMaisSeVisivel() {
  if (!alunosTemMais || alunosCarregando) return;
  const topo = sentinelaAlunos.getBoundingClientRect().top;
  if (topo <= window.innerHeight + 160) listarAlunos(true);
}

async function salvarAluno(evento) {
  evento.preventDefault();
  const nome = inputNome.value.trim();
  const ra = inputRa.value.trim();
  const curso_id = Number(selectCurso.value);

  if (modo === 'criar') {
    const resposta = await fetch('/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, ra, curso_id }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMsg(dados.erro || 'Erro ao cadastrar', 'erro');
      return;
    }
    mostrarMsg('Aluno cadastrado com sucesso!', 'ok');
  } else {
    const resposta = await fetch('/alunos/' + encodeURIComponent(raEditando), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, curso_id }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMsg(dados.erro || 'Erro ao atualizar', 'erro');
      return;
    }
    if (!dados.length) {
      mostrarMsg('RA não encontrado', 'erro');
      return;
    }
    mostrarMsg('Aluno atualizado com sucesso!', 'ok');
  }
  fecharModal();
  atualizarTudo();
}

async function excluirAluno(ra, nome) {
  if (!confirm(`Excluir o aluno "${nome}" (RA ${ra})?`)) return;
  const resposta = await fetch('/alunos/' + encodeURIComponent(ra), { method: 'DELETE' });
  const dados = await resposta.json();
  if (!resposta.ok) {
    mostrarMsg(dados.erro || 'Erro ao excluir', 'erro');
    return;
  }
  mostrarMsg('Aluno excluído.', 'ok');
  atualizarTudo();
}

async function atualizarTudo() {
  await listarCursos();
  atualizarFiltrosAtivos();
  await listarAlunos(false);
}

// ================= LIGANDO OS EVENTOS =================
document.getElementById('btn-novo').addEventListener('click', abrirModalCriar);
document.getElementById('btn-atualizar').addEventListener('click', () => {
  limparBusca(); // Opcional: Atualizar do painel zera a busca mas deixa o curso
  atualizarTudo();
});
document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
document.getElementById('modal-fundo').addEventListener('click', fecharModal);

form.addEventListener('submit', salvarAluno);
formCurso.addEventListener('submit', adicionarCurso);
formBusca.addEventListener('submit', pesquisarAlunos);

filtroCurso.addEventListener('change', () => {
  atualizarFiltrosAtivos();
  listarAlunos(false);
});

thBotoesOrdem.forEach(btn => {
  btn.addEventListener('click', () => ordenarPorColuna(btn.dataset.ordem));
});

window.addEventListener('scroll', pedirMaisSeVisivel, { passive: true });
window.addEventListener('resize', pedirMaisSeVisivel);

atualizarTudo();