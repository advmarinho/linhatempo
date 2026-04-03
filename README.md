# Gerenciador RH – PMO SONOVA

Sistema visual e interativo para gestão de atividades de RH, com foco em organização operacional, produtividade e acompanhamento de entregas.

Desenvolvido com HTML, CSS e JavaScript puro, com armazenamento local (localStorage), permitindo uso offline e sem necessidade de instalação.

---

## Visão Geral

O sistema permite:

- Planejamento diário de atividades (Linha do Tempo)
- Gestão de fluxo de trabalho (Kanban)
- Visualização de prazos (Gantt)
- Controle de progresso das entregas
- Exportação e backup de dados

Ideal para áreas de RH, Departamento Pessoal e PMO.

---

## Funcionalidades

### Linha do Tempo

- Visualização mensal em formato de dias
- Cadastro de atividades por dia
- Campos:
  - Atividade
  - Responsável
  - Prioridade (Alta, Média, Baixa)
  - Status (Pendente, Em andamento, Concluído)
  - Data início e fim
  - Dependências
  - Observações
- Edição direta na tabela
- Texto das atividades com ajuste automático (sem corte)
- Destaque visual:
  - Dias concluídos
  - Finais de semana
- Ações em lote:
  - Resetar status para pendente
  - Mover atividades de final de semana para dia útil

---

### Fluxo (Kanban)

- Separação automática por status:
  - Pendente
  - Em andamento
  - Concluído
- Destaque de atividades atrasadas
- Pesquisa dinâmica
- Clique no card leva para o dia correspondente

---

### Gantt

- Visualização de prazo das atividades
- Barra proporcional entre data início e fim
- Cores por prioridade:
  - Alta: vermelho
  - Média: laranja
  - Baixa: azul
- Verde para atividades concluídas
- Tooltip com descrição completa da atividade
- Clique leva para o detalhe

---

### Indicadores

- Percentual de progresso automático
- Total de atividades vs concluídas

---

### Exportações

- Exportação para Excel
- Backup em JSON
- Importação de backup

---

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- LocalStorage (armazenamento local)
- Biblioteca XLSX (exportação Excel)

---

## Como Usar

1. Abra o arquivo:

2. Não é necessário instalar nada

3. O sistema salva automaticamente no navegador

---

## Estrutura dos Dados

Os dados são armazenados no navegador no seguinte formato:

```json
{
  "1": [
    {
      "text": "Atividade",
      "responsavel": "Nome",
      "prioridade": "Média",
      "status": "Pendente",
      "inicio": "2026-04-01",
      "fim": "2026-04-05",
      "depende": "",
      "obs": ""
    }
  ]
}
