require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const {
  inserirCurso, listarCursos, excluirCurso,
  inserirAluno, listarAlunos, listarAlunosDoCurso,
  buscarPorRa, atualizarAluno, excluirPorRa,
  listarAlunosPaginado
} = require('./supabase');

const ERRO_CHAVE_ESTRANGEIRA = '23503';
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Funções de leitura da URL
function lerPagina(query) {
  if (query.limite === undefined && query.inicio === undefined) return null;
  const limite = Number(query.limite);
  const inicio = query.inicio === undefined ? 0 : Number(query.inicio);

  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    return { erro: 'Informe limite entre 1 e 100' };
  }
  if (!Number.isInteger(inicio) || inicio < 0) {
    return { erro: 'inicio inválido' };
  }
  return { inicio, limite };
}

function lerBusca(query) {
  if (typeof query.busca !== 'string') return '';
  return query.busca.trim();
}

function lerOrdenacao(query) {
  const permitidas = { nome: 'nome', ra: 'ra', curso: 'curso' };
  const ordem = permitidas[query.ordem];
  if (!ordem) return null;
  const direcao = query.direcao === 'desc' ? 'desc' : 'asc';
  return { ordem, direcao };
}

function opcoesDaLista(query) {
  const pagina = lerPagina(query);
  if (pagina && pagina.erro) return { erro: pagina.erro };
  return {
    pagina,
    busca: lerBusca(query),
    ordenacao: lerOrdenacao(query)
  };
}

function respostaDaLista(res, pagina, dados, busca, ordenacao) {
  if (pagina) {
    res.json({ ...dados, inicio: pagina.inicio, limite: pagina.limite });
  } else {
    res.json(dados);
  }
}

// ================= ROTAS DE ALUNOS =================
app.get('/alunos', async (req, res) => {
  try {
    const lida = opcoesDaLista(req.query);
    if (lida.erro) return res.status(400).json({ erro: lida.erro });

    if (lida.pagina) {
      const dados = await listarAlunosPaginado(
        null, lida.pagina.inicio, lida.pagina.limite, 
        lida.busca, lida.ordenacao?.ordem, lida.ordenacao?.direcao === 'asc'
      );
      respostaDaLista(res, lida.pagina, dados, lida.busca, lida.ordenacao);
    } else {
      res.json(await listarAlunos());
    }
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.get('/alunos/:ra', async (req, res) => {
  try {
    const aluno = await buscarPorRa(req.params.ra);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.post('/alunos', async (req, res) => {
  try {
    const { nome, ra, curso_id } = req.body;
    if (!nome || !ra || !curso_id) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, ra e curso_id' });
    }
    const aluno = await inserirAluno(nome, ra, curso_id);
    res.status(201).json(aluno);
  } catch (e) {
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) return res.status(400).json({ erro: 'O curso informado não existe' });
    res.status(400).json({ erro: e.message });
  }
});

app.put('/alunos/:ra', async (req, res) => {
  try {
    const { nome, curso_id } = req.body;
    if (!nome && !curso_id) return res.status(400).json({ erro: 'Informe nome e/ou curso_id para atualizar' });
    const data = await atualizarAluno(req.params.ra, nome, curso_id);
    res.json(data);
  } catch (e) {
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) return res.status(400).json({ erro: 'O curso informado não existe' });
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/alunos/:ra', async (req, res) => {
  try {
    res.json(await excluirPorRa(req.params.ra));
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

// ================= ROTAS DE CURSOS =================
app.get('/cursos', async (req, res) => {
  try { res.json(await listarCursos()); } 
  catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/cursos', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Campo obrigatório: nome' });
    res.status(201).json(await inserirCurso(nome));
  } catch (e) { res.status(400).json({ erro: e.message }); }
});

app.delete('/cursos/:id', async (req, res) => {
  try {
    res.json(await excluirCurso(req.params.id));
  } catch (e) {
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) {
      return res.status(409).json({ erro: 'Não é possível excluir: este curso ainda tem alunos' });
    }
    res.status(400).json({ erro: e.message });
  }
});

app.get('/cursos/:id/alunos', async (req, res) => {
  try {
    const lida = opcoesDaLista(req.query);
    if (lida.erro) return res.status(400).json({ erro: lida.erro });

    if (lida.pagina) {
      const dados = await listarAlunosPaginado(
        req.params.id, lida.pagina.inicio, lida.pagina.limite, 
        lida.busca, lida.ordenacao?.ordem, lida.ordenacao?.direcao === 'asc'
      );
      respostaDaLista(res, lida.pagina, dados, lida.busca, lida.ordenacao);
    } else {
      res.json(await listarAlunosDoCurso(req.params.id));
    }
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});