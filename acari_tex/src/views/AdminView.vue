
<template>
  <div class="admin-wrapper">
    <!-- Cabeçalho -->
    <header class="pagina-header">
      <div>
        <h1 class="titulo">Controle Interno</h1>
        <p class="subtitulo">
          Gerencie os estabelecimentos e acompanhe o desempenho da plataforma.
        </p>
      </div>

      <div class="header-acoes">
        <button class="btn-principal" @click="abrirCadastro">
          + Novo estabelecimento
        </button>
      </div>
    </header>

    <!-- Indicadores -->
    <section class="indicadores">
      <div class="indicador-card">
        <div class="indicador-icone verde">🏭</div>
        <div>
          <span>Total de estabelecimentos</span>
          <strong>{{ estabelecimentos.length }}</strong>
        </div>
      </div>

      <div class="indicador-card">
        <div class="indicador-icone azul">👥</div>
        <div>
          <span>Total de funcionários</span>
          <strong>{{ totalFuncionarios }}</strong>
        </div>
      </div>

      <div class="indicador-card">
        <div class="indicador-icone amarelo">📈</div>
        <div>
          <span>Eficiência média</span>
          <strong>{{ eficienciaMedia }}</strong>
        </div>
      </div>

      <div class="indicador-card">
        <div class="indicador-icone roxo">✓</div>
        <div>
          <span>Estabelecimentos ativos</span>
          <strong>{{ estabelecimentosAtivos }}</strong>
        </div>
      </div>
    </section>

    <!-- Lista de estabelecimentos -->
    <section class="lista-section">
      <div class="lista-header">
        <div>
          <h2>Estabelecimentos cadastrados</h2>
        </div>
        <span class="contador">
          {{ estabelecimentosFiltrados.length }} resultado(s)
        </span>
      </div>

      <!-- Pesquisa e filtros -->
      <div class="filtros">
        <div class="campo-pesquisa">
          <span>⌕</span>
          <input
            v-model="pesquisa"
            type="text"
            placeholder="Pesquisar por nome ou CNPJ..."
          />
        </div>

        <select v-model="filtroEficiencia">
          <option value="">Todas as eficiências</option>
          <option value="alta">Alta (80% ou mais)</option>
          <option value="media">Média (50% a 79%)</option>
          <option value="baixa">Baixa (abaixo de 50%)</option>
          <option value="sem-dados">Sem dados</option>
        </select>

        <button class="btn-limpar" @click="limparFiltros">
          Limpar filtros
        </button>
      </div>

      <!-- Carregamento -->
      <div v-if="carregandoLista" class="estado-vazio">
        Carregando estabelecimentos...
      </div>

      <!-- Erro -->
      <div v-else-if="erroLista" class="mensagem-erro">
        {{ erroLista }}
        <button @click="carregarEstabelecimentos">Tentar novamente</button>
      </div>

      <!-- Tabela -->
      <div v-else-if="estabelecimentosFiltrados.length" class="tabela-container">
        <table>
          <thead>
            <tr>
              <th>Estabelecimento</th>
              <th>CNPJ</th>
              <th>Funcionários</th>
              <th>Eficiência atual</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="estabelecimento in estabelecimentosFiltrados"
              :key="estabelecimento.cnpj"
            >
              <td>
                <div class="empresa-info">
                  <div class="empresa-avatar">
                    {{ estabelecimento.nome?.charAt(0)?.toUpperCase() || "E" }}
                  </div>
                  <div>
                    <strong>{{ estabelecimento.nome }}</strong>
                  </div>
                </div>
              </td>

              <td>{{ estabelecimento.cnpj || "Não informado" }}</td>

              <td>
                <strong>{{ estabelecimento.funcionarios_ativos }}</strong>
                <small>
                    de {{ estabelecimento.quantidade_funcionarios }} cadastrados
                </small>
              </td>

              <td>
                <template v-if="estabelecimento.eficiencia_atual !== null">
                  <div class="eficiencia-info">
                    <strong>
                      {{ estabelecimento.eficiencia_atual }}%
                    </strong>
                    <div class="barra-fundo">
                      <div
                        class="barra-progresso"
                        :style="{
                          width: Math.min(
                            100,
                            estabelecimento.eficiencia_atual
                          ) + '%'
                        }"
                      ></div>
                    </div>
                  </div>
                </template>
                <span v-else class="sem-dados">Sem dados</span>
              </td>

              <td>
                <div class="acoes-tabela">
                  <button
                    class="acao-detalhes"
                    @click="verDetalhes(estabelecimento)"
                    title="Ver detalhes"
                  >
                    Detalhes
                  </button>

                  <button
                    class="acao-funcionario"
                    @click="abrirCadastroFuncionario(estabelecimento)"
                    title="Adicionar funcionário"
                  >
                    + Funcionário
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="estado-vazio">
        <span>🏭</span>
        <h3>Nenhum estabelecimento encontrado</h3>
        <p>Experimente alterar os filtros ou cadastre um novo estabelecimento.</p>
        <button class="btn-principal" @click="abrirCadastro">
          Cadastrar estabelecimento
        </button>
      </div>
    </section>

    <!-- Modal de cadastro do estabelecimento -->
    <div
      v-if="modalEstabelecimento"
      class="modal-overlay"
      @click.self="fecharModais"
    >
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Novo estabelecimento</h2>
            <p>Etapa 1 de 2 — Dados da fábrica</p>
          </div>
          <button class="fechar" @click="fecharModais">×</button>
        </div>

        <form @submit.prevent="cadastrarEstabelecimento">
          <label>Nome do estabelecimento *</label>
          <input
            v-model="formEstabelecimento.nome"
            required
            placeholder="Ex.: Confecções Acari"
          />

          <label>CNPJ *</label>
          <input
            v-model="formEstabelecimento.cnpj"
            required
            placeholder="00.000.000/0000-00"
          />

          <label>Telefone</label>
          <input
            v-model="formEstabelecimento.telefone"
            placeholder="(00) 00000-0000"
          />

          <label>Endereço</label>
          <input
            v-model="formEstabelecimento.endereco"
            placeholder="Endereço do estabelecimento"
          />

          <div class="modal-acoes">
            <button type="button" class="btn-cancelar" @click="fecharModais">
              Cancelar
            </button>
            <button type="submit" class="btn-principal" :disabled="salvando">
              {{ salvando ? "Salvando..." : "Salvar e cadastrar funcionário →" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de cadastro do primeiro funcionário -->
    <div
      v-if="modalFuncionario"
      class="modal-overlay"
      @click.self="fecharModais"
    >
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Novo funcionário</h2>
            <p>Etapa 2 de 2 — Usuário inicial do estabelecimento</p>
          </div>
          <button class="fechar" @click="fecharModais">×</button>
        </div>

        <div class="empresa-selecionada">
          <span>Estabelecimento vinculado</span>
          <strong>{{ estabelecimentoSelecionado?.nome }}</strong>
        </div>

        <form @submit.prevent="cadastrarFuncionario">
          <label>Nome completo *</label>
          <input
            v-model="formFuncionario.nome"
            required
            placeholder="Nome do funcionário"
          />

          <label>E-mail *</label>
          <input
            v-model="formFuncionario.email"
            type="email"
            required
            placeholder="funcionario@empresa.com"
          />

          <label>CPF</label>
          <input
            v-model="formFuncionario.cpf"
            placeholder="000.000.000-00"
          />

          <label>Cargo *</label>
          <input
            v-model="formFuncionario.cargo"
            required
            placeholder="Ex.: Gerente de produção"
          />

          <label>Senha inicial *</label>
          <input
            v-model="formFuncionario.senha"
            type="password"
            required
            minlength="8"
            placeholder="Mínimo de 8 caracteres"
          />

          <div class="modal-acoes">
            <button type="button" class="btn-cancelar" @click="fecharModais">
              Cancelar
            </button>
            <button type="submit" class="btn-principal" :disabled="salvando">
              {{ salvando ? "Salvando..." : "Concluir cadastro" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de detalhes -->
    <div
      v-if="modalDetalhes"
      class="modal-overlay"
      @click.self="fecharModais"
    >
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>{{ estabelecimentoSelecionado?.nome }}</h2>
            <p>Informações do estabelecimento</p>
          </div>
          <button class="fechar" @click="fecharModais">×</button>
        </div>

        <div class="detalhes-grid">
          <div>
            <span>CNPJ</span>
            <strong>{{ estabelecimentoSelecionado?.cnpj || "Não informado" }}</strong>
          </div>
          <div>
            <span>Funcionários</span>
            <strong>{{ estabelecimentoSelecionado?.quantidade_funcionarios }}</strong>
          </div>
          <div>
            <span>Eficiência atual</span>
            <strong>
              {{
                estabelecimentoSelecionado?.eficiencia_atual !== null
                  ? estabelecimentoSelecionado?.eficiencia_atual + "%"
                  : "Sem dados"
              }}
            </strong>
          </div>
          <div>
            <span>Situação</span>
            <strong>
              {{ estabelecimentoSelecionado?.ativo ? "Ativo" : "Inativo" }}
            </strong>
          </div>
          <div>
            <span>Telefone</span>
            <strong>{{ estabelecimentoSelecionado?.telefone || "Não informado" }}</strong>
          </div>
        </div>

        <div class="modal-acoes">
          <button class="btn-cancelar" @click="fecharModais">Fechar</button>
          <button
            class="btn-principal"
            @click="abrirCadastroFuncionario(estabelecimentoSelecionado)"
          >
            + Adicionar funcionário
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import api from "@/Axios";
import { useAuthStore } from "@/store/store.js";

export default {
  name: "AdminView",

  data() {
    return {
      usuario: null,

      estabelecimentos: [],
      pesquisa: "",
      filtroEficiencia: "",

      carregando: false,
      carregandoLista: false,
      salvando: false,

      erroLista: "",

      estado: "",
      mensagem: "Aguardando...",

      modalEstabelecimento: false,
      modalFuncionario: false,
      modalDetalhes: false,

      estabelecimentoSelecionado: null,

      formEstabelecimento: {
        nome: "",
        cnpj: "",
        telefone: "",
        endereco: "",
      },

      formFuncionario: {
        nome: "",
        email: "",
        cpf: "",
        cargo: "",
        senha: "",
      },
    };
  },

  
computed: {
  estabelecimentosFiltrados() {
    return this.estabelecimentos.filter((e) => {
      const termo = this.pesquisa.toLowerCase().trim();

      // Filtro por nome ou CNPJ
      const correspondePesquisa =
        !termo ||
        e.nome?.toLowerCase().includes(termo) ||
        e.cnpj?.toLowerCase().includes(termo);

      // Filtro por eficiência
      let correspondeEficiencia = true;

      if (this.filtroEficiencia === "alta") {
        correspondeEficiencia =
          e.eficiencia_atual !== null && e.eficiencia_atual >= 80;
      } else if (this.filtroEficiencia === "media") {
        correspondeEficiencia =
          e.eficiencia_atual !== null &&
          e.eficiencia_atual >= 50 &&
          e.eficiencia_atual < 80;
      } else if (this.filtroEficiencia === "baixa") {
        correspondeEficiencia =
          e.eficiencia_atual !== null && e.eficiencia_atual < 50;
      } else if (this.filtroEficiencia === "sem-dados") {
        correspondeEficiencia = e.eficiencia_atual === null;
      }

      return (
        correspondePesquisa &&
        correspondeEficiencia
      );
    });
  },

  totalFuncionarios() {
    return this.estabelecimentos.reduce(
      (total, e) => total + (Number(e.quantidade_funcionarios) || 0),
      0
    );
  },

  estabelecimentosAtivos() {
    return this.estabelecimentos.filter((e) => e.ativo).length;
  },

  eficienciaMedia() {
    const comDados = this.estabelecimentos.filter(
      (e) => e.eficiencia_atual !== null
    );

    if (!comDados.length) return "Sem dados";

    const media =
      comDados.reduce((total, e) => total + e.eficiencia_atual, 0) /
      comDados.length;

    return `${media.toFixed(1)}%`;
  },
},


  mounted() {
    const authStore = useAuthStore();
    this.usuario = authStore.pegar_usuario;

    this.testarPing();
    this.carregarEstabelecimentos();
  },

  methods: {
    headersAuth() {
      const authStore = useAuthStore();

      return {
        Authorization: authStore.pegar_token,
      };
    },

    // Busca os estabelecimentos
    async carregarEstabelecimentos() {
      this.carregandoLista = true;
      this.erroLista = "";

      try {
        const response = await api.get("/admin/estabelecimentos", {
          headers: this.headersAuth(),
        });

        const dados = Array.isArray(response.data)
          ? response.data
          : response.data.estabelecimentos || [];

        this.estabelecimentos = dados.map((e) => {
          const eficiencia =
            e.eficiencia_atual ?? e.eficiencia ?? null;

          return {
            ...e,
            quantidade_funcionarios: Number(
              e.quantidade_funcionarios ??
              e.total_funcionarios ??
              e.funcionarios?.length ??
              0
            ),
            eficiencia_atual:
              eficiencia !== null && Number.isFinite(Number(eficiencia))
                ? Number(eficiencia)
                : null,
          };
        });
      } catch (error) {
        console.error("Erro ao buscar estabelecimentos:", error);

        this.erroLista =
          error.response?.data?.message ||
          "Não foi possível carregar os estabelecimentos.";
      } finally {
        this.carregandoLista = false;
      }
    },

    limparFiltros() {
      this.pesquisa = "";
      this.filtroEficiencia = "";
    },

    abrirCadastro() {
      this.formEstabelecimento = {
        nome: "",
        cnpj: "",
        telefone: "",
        endereco: "",
      };

      this.modalEstabelecimento = true;
    },

    // Cadastra o estabelecimento e abre a segunda etapa
    async cadastrarEstabelecimento() {
      this.salvando = true;

      try {
        const response = await api.post(
          "/admin/estabelecimentos",
          this.formEstabelecimento,
          { headers: this.headersAuth() }
        );

        const estabelecimento = response.data.estabelecimento || response.data;

        if (!estabelecimento.cnpj) {
          throw new Error(
            "O servidor não retornou o CNPJ do estabelecimento cadastrado."
          );
        }

        this.estabelecimentoSelecionado = estabelecimento;
        this.modalEstabelecimento = false;
        this.modalFuncionario = true;

        this.formFuncionario = {
          nome: "",
          email: "",
          cpf: "",
          cargo: "",
          senha: "",
        };
      } catch (error) {
        console.error("Erro ao cadastrar estabelecimento:", error);

        alert(
          error.response?.data?.message ||
          error.message ||
          "Não foi possível cadastrar o estabelecimento."
        );
      } finally {
        this.salvando = false;
      }
    },

    // Cadastro do funcionário vinculado ao estabelecimento
    async cadastrarFuncionario() {
        this.salvando = true;

        try {
            await api.post(
            "/admin/funcionarios",
            {
                nome: this.formFuncionario.nome,
                email: this.formFuncionario.email,
                cpf: this.formFuncionario.cpf,
                funcao: this.formFuncionario.cargo,
                senha: this.formFuncionario.senha,
                cnpj: this.estabelecimentoSelecionado.cnpj
            },
            { headers: this.headersAuth() }
            );

            alert("Estabelecimento e funcionário cadastrados com sucesso!");

            this.fecharModais();
            await this.carregarEstabelecimentos();

        } catch (error) {
            console.error("Erro ao cadastrar funcionário:", error);

            alert(
            error.response?.data?.message ||
            "O estabelecimento foi cadastrado, mas não foi possível cadastrar o funcionário."
            );
        } finally {
            this.salvando = false;
        }
    },

    // Cadastro de funcionário em estabelecimento já existente
    abrirCadastroFuncionario(estabelecimento) {
      this.estabelecimentoSelecionado = estabelecimento;

      this.formFuncionario = {
        nome: "",
        email: "",
        cpf: "",
        cargo: "",
        senha: "",
      };

      this.modalDetalhes = false;
      this.modalFuncionario = true;
    },

    verDetalhes(estabelecimento) {
      this.estabelecimentoSelecionado = estabelecimento;
      this.modalDetalhes = true;
    },

    fecharModais() {
      this.modalEstabelecimento = false;
      this.modalFuncionario = false;
      this.modalDetalhes = false;
      this.estabelecimentoSelecionado = null;
    },

    async testarPing() {
      this.carregando = true;
      this.estado = "";
      this.mensagem = "Aguardando...";

      try {
        const response = await api.get("/admin/ping", {
          headers: this.headersAuth(),
        });

        this.estado = "ok";
        this.mensagem = `Conectado (${response.status})`;
      } catch (error) {
        this.estado = "erro";

        const status = error.response?.status;

        this.mensagem = status
          ? `Erro ${status}: ${
              error.response?.data?.message || "sem mensagem"
            }`
          : "Sem resposta do servidor";
      } finally {
        this.carregando = false;
      }
    },
  },
};
</script>

<style scoped>
.admin-wrapper {
  min-height: 100vh;
  padding: 35px 4%;
  background: #f5f7f6;
  color: #26372e;
}

.pagina-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
}

.titulo {
  color: #0d3927;
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.subtitulo {
  color: #777;
  margin-top: 7px;
}

.header-acoes {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  cursor: pointer;
  font-family: inherit;
  transition: 0.2s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-principal,
.btn-secundario {
  padding: 11px 17px;
  border-radius: 9px;
  font-weight: 600;
  border: none;
}

.btn-principal {
  background: #145a32;
  color: white;
}

.btn-principal:hover {
  background: #0d3927;
}

.btn-secundario {
  background: white;
  color: #145a32;
  border: 1px solid #dce5df;
}

.admin-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 22px;
  box-shadow: 0 2px 8px #00000008;
}

.admin-info div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-info span {
  color: #777;
  font-size: 13px;
}

.admin-badge {
  background: #e6f3e9;
  color: #145a32 !important;
  padding: 7px 12px;
  border-radius: 20px;
  font-weight: 600;
}

.indicadores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 25px;
}

.indicador-card {
  background: white;
  padding: 22px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 3px 12px #00000008;
}

.indicador-card div:last-child {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.indicador-card span {
  color: #777;
  font-size: 13px;
}

.indicador-card strong {
  color: #173d2c;
  font-size: 25px;
}

.indicador-icone {
  width: 45px;
  height: 45px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 21px;
}

.verde { background: #e3f4e8; }
.azul { background: #e5efff; }
.amarelo { background: #fff4d9; }
.roxo { background: #f0e8ff; }

.lista-section {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 3px 12px #00000008;
}

.lista-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.lista-header h2 {
  color: #173d2c;
  font-size: 20px;
  margin: 0 0 6px;
}

.lista-header p {
  color: #888;
  font-size: 13px;
  margin: 0;
}

.contador {
  background: #edf5ef;
  color: #145a32;
  padding: 7px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.filtros {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.campo-pesquisa {
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #ddd;
  border-radius: 9px;
  padding: 0 12px;
}

.campo-pesquisa span {
  font-size: 22px;
  color: #777;
}

.campo-pesquisa input {
  border: none;
  outline: none;
  width: 100%;
  padding: 12px 0;
}

.filtros select {
  border: 1px solid #ddd;
  border-radius: 9px;
  padding: 11px;
  color: #555;
  background: white;
}

.btn-limpar {
  background: transparent;
  color: #145a32;
  border: none;
  font-weight: 600;
}

.tabela-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 850px;
}

th {
  background: #f7f9f7;
  color: #777;
  text-align: left;
  font-size: 12px;
  padding: 15px 12px;
  font-weight: 600;
}

td {
  padding: 16px 12px;
  border-bottom: 1px solid #eee;
  font-size: 13px;
}

.empresa-info {
  display: flex;
  align-items: center;
  gap: 11px;
}

.empresa-info > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.empresa-info strong {
  color: #173d2c;
}

.empresa-info small {
  color: #999;
}

.empresa-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: #e4f2e8;
  color: #145a32;
  border-radius: 10px;
  font-weight: 700;
}

.eficiencia-info {
  min-width: 100px;
}

.eficiencia-info strong {
  display: block;
  margin-bottom: 6px;
}

.barra-fundo {
  height: 6px;
  background: #e9eee9;
  border-radius: 10px;
  overflow: hidden;
}

.barra-progresso {
  height: 100%;
  background: #26965b;
  border-radius: 10px;
}

.sem-dados {
  color: #999;
}

.acoes-tabela {
  display: flex;
  align-items: center;
  gap: 10px;
}

.acao-detalhes,
.acao-funcionario {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.acao-detalhes {
  color: #145a32;
}

.acao-funcionario {
  color: #4774a8;
}

.estado-vazio {
  text-align: center;
  padding: 45px 20px;
  color: #888;
}

.estado-vazio > span {
  font-size: 35px;
}

.estado-vazio h3 {
  color: #173d2c;
}

.estado-vazio button {
  margin-top: 12px;
}

.mensagem-erro {
  padding: 25px;
  color: #b3261e;
  text-align: center;
}

.mensagem-erro button {
  display: block;
  margin: 12px auto;
}

.conexao {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 17px 20px;
  margin-top: 22px;
}

.conexao p {
  font-size: 12px;
  margin: 5px 0 0;
}

.status-conexao.ok {
  color: #218348;
}

.status-conexao.erro {
  color: #b3261e;
}

/* Modais */

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #00000070;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  padding: 27px;
  border-radius: 16px;
  box-shadow: 0 10px 40px #00000030;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
}

.modal-header h2 {
  color: #145a32;
  font-size: 21px;
  margin: 0;
}

.modal-header p {
  color: #888;
  font-size: 12px;
  margin-top: 7px;
}

.fechar {
  border: none;
  background: transparent;
  font-size: 28px;
  color: #777;
}

.modal form {
  display: flex;
  flex-direction: column;
}

.modal label {
  color: #444;
  font-size: 13px;
  font-weight: 600;
  margin: 12px 0 7px;
}

.modal input {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  outline: none;
  font-family: inherit;
}

.modal input:focus {
  border-color: #145a32;
}

.modal-acoes {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

.btn-cancelar {
  padding: 11px 17px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 9px;
  color: #666;
  font-weight: 600;
}

.empresa-selecionada {
  background: #eff7f1;
  padding: 13px;
  border-radius: 9px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 15px;
}

.empresa-selecionada span,
.detalhes-grid span {
  color: #888;
  font-size: 12px;
}

.empresa-selecionada strong {
  color: #145a32;
}

.detalhes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.detalhes-grid div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.detalhes-grid strong {
  color: #173d2c;
  font-size: 14px;
}

@media (max-width: 1000px) {
  .indicadores {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 650px) {
  .admin-wrapper {
    padding: 25px 15px;
  }

  .pagina-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .indicadores {
    grid-template-columns: 1fr;
  }

  .lista-section {
    padding: 16px;
  }

  .lista-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .filtros {
    flex-direction: column;
  }

  .filtros select {
    width: 100%;
  }

  .conexao {
    gap: 12px;
    align-items: flex-start;
    flex-direction: column;
  }

  .modal-acoes {
    flex-direction: column-reverse;
  }

  .modal-acoes button {
    width: 100%;
  }
}
</style>
