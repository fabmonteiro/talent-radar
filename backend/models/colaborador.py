from typing import Optional
from pydantic import BaseModel


class ColaboradorCreate(BaseModel):
    nome: str
    idade: Optional[int] = None
    ramo: Optional[str] = None
    seniority: Optional[str] = None
    anos_experiencia: Optional[int] = None
    bio: Optional[str] = None


class ColaboradorUpdate(BaseModel):
    nome: Optional[str] = None
    idade: Optional[int] = None
    ramo: Optional[str] = None
    seniority: Optional[str] = None
    anos_experiencia: Optional[int] = None
    bio: Optional[str] = None


class ExperienciaCreate(BaseModel):
    empresa: Optional[str] = None
    role: Optional[str] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    descricao: Optional[str] = None


class ProjetoCreate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    tecnologias: Optional[str] = None


class ColaboradorSkillCreate(BaseModel):
    skill_id: str
    nivel: Optional[str] = None


class ColaboradorIdiomaCreate(BaseModel):
    idioma_id: str
    nivel: Optional[str] = None


class ColaboradorCertCreate(BaseModel):
    cert_id: str
    ano: Optional[str] = None
