-- Fix misspelling: 'Intermediário' → 'Intermédio'
UPDATE colaborador_skills SET nivel = 'Intermédio' WHERE nivel = 'Intermediário';
UPDATE colaborador_idiomas SET nivel = 'Intermédio' WHERE nivel = 'Intermediário';
