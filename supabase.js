require('dotenv').config();

// importa a função que constrói o cliente HTTP do Supabase
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inserirCurso(nome) {
  const { data, error } = await supabase
    .from('cursos')
    .insert([{ nome }])
    .select()
    .single();

  if (error) throw error;
  return data;    // { id, nome, criado_em }
}

async function listarCursos() {
  const { data, error } = await supabase
    .from('cursos')
    .select('id, nome, alunos(count)')   // conta os alunos relacionados
    .order('nome', { ascending: true });

  if (error) throw error;
  return data.map((curso) => ({
    id: curso.id,
    nome: curso.nome,
    total_alunos: curso.alunos[0]?.count ?? 0,
  }));
}

async function excluirCurso(id) {
  const { data, error } = await supabase
    .from('cursos').delete().eq('id', id).select();

  if (error) throw error;
  return data;
}