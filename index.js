const {
  inserirCurso, listarCursos,
  inserirAluno, listarAlunos, listarAlunosDoCurso,
  buscarPorRa, buscarPorNome, atualizarAluno, excluirPorRa,
} = require('./supabase');

async function main() {
  try {
    // 1. Insere Cursos Iniciais
    for (const nome of ['ADS', 'Gestão Comercial']) {
      try {
        await inserirCurso(nome);
      } catch (e) {
        console.log(`Curso "${nome}" não inserido (talvez já exista)`);
      }
    }
    
    const cursos = await listarCursos();
    console.log('Cursos:', cursos);
    
    // Pega os ids pelo nome — o aluno guarda o ID do curso, não o nome
    const ads = cursos.find((c) => c.nome === 'ADS');
    const gestao = cursos.find((c) => c.nome === 'Gestão Comercial');
    
    // 2. Insere Aluno de Teste
    try {
      if (ads) {
        const novo = await inserirAluno('Maria Silva', '2026001', ads.id);
        console.log('Inserido com sucesso:', novo);
      } else {
        console.log('Curso ADS não encontrado no banco para vincular ao aluno.');
      }
    } catch (e) {
      console.log('Não inseriu aluno (talvez RA já exista):', e.message || e);
    }
    
    const todos = await listarAlunos();
    console.log(`Total de alunos: ${todos.length}`, todos);
    
    // 3. Atualiza Aluno de Teste
    if (gestao) {
      await atualizarAluno('2026001', 'Maria Silva', gestao.id);
      
      // 1:N na prática: todos os alunos de UM curso
      const daGestao = await listarAlunosDoCurso(gestao.id);
      console.log('Alunos de Gestão Comercial:', daGestao);
    }
    
  } catch (err) {
    console.error('ERRO GERAL:', err.message || err);
  }
}

main();