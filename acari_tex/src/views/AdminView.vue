
<template>
    <div>
        <div>
            <SidebarNav style="z-index: 1" />
        </div>

        <carregandoTela v-if="carregando" />

        <main v-else class="content-wrapper flex-grow-1">
            <div class="container-fluid my-4 mt-md-4 mt-3">
            <header class="pagina-header">
            <div>
                <h1 class="titulo">Controle Interno</h1>
                <p class="subtitulo">
                    Gerencie os estabelecimentos e acompanhe o desempenho da plataforma.
                </p>
            </div>

      <div class="header-acoes">
        <button class="btn btn-sec" :disabled="carregando" @click="carregar(true)">
          {{ carregando ? "Atualizando..." : "Atualizar" }}
        </button>
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
      class="admin-modal-overlay"
      @click.self="fecharModais"
    >
      <form class="admin-modal" @submit.prevent="salvarEstabelecimento">
        <h2>Novo estabelecimento</h2>
        <p class="admin-modal-sub">
          Cadastre a fábrica e o primeiro usuário, que será o administrador dela.
        </p>
 
        <h3>Dados do estabelecimento</h3>
        <div class="grade">
          <label class="rotulo">
            CNPJ *
            <input
              class="campo"
              :value="formEstab.cnpj"
              inputmode="numeric"
              placeholder="00.000.000/0000-00"
              required
              @input="formEstab.cnpj = mascararCnpj($event.target.value)"
            />
          </label>
          <label class="rotulo">
            Nome *
            <input v-model="formEstab.nome" class="campo" maxlength="120" required />
          </label>
          <label class="rotulo">
            Telefone
            <input v-model="formEstab.telefone" class="campo" maxlength="30" />
          </label>
          <label class="rotulo">
            Endereço
            <input v-model="formEstab.endereco" class="campo" maxlength="255" />
          </label>
        </div>
 
        <h3>Primeiro usuário (administrador)</h3>
        <div class="grade">
          <label class="rotulo">
            Nome *
            <input v-model="formEstab.gestor.nome" class="campo" maxlength="120" required />
          </label>
          <label class="rotulo">
            E-mail *
            <input
              v-model="formEstab.gestor.email"
              class="campo"
              type="email"
              maxlength="191"
              autocomplete="off"
              required
            />
          </label>
          <label class="rotulo">
            Idade *
            <input
              v-model.number="formEstab.gestor.idade"
              class="campo"
              type="number"
              min="14"
              max="100"
              required
            />
          </label>
          <label class="rotulo">
            Telefone
            <input v-model="formEstab.gestor.telefone" class="campo" maxlength="30" />
          </label>
        </div>
        <div class="linha-senha">
          <label class="rotulo flex-1">
            Senha inicial * (mínimo 8 caracteres)
            <input
              v-model="formEstab.gestor.senha"
              class="campo"
              :type="mostrarSenha ? 'text' : 'password'"
              minlength="8"
              maxlength="72"
              autocomplete="new-password"
              required
            />
          </label>
          <button type="button" class="btn btn-sec" @click="mostrarSenha = !mostrarSenha">
            {{ mostrarSenha ? "Ocultar" : "Mostrar" }}
          </button>
          <button type="button" class="btn btn-sec" @click="gerarSenha(formEstab.gestor)">
            Gerar senha
          </button>
        </div>
 
        <p v-if="erroForm" class="aviso aviso-erro">{{ erroForm }}</p>
 
        <div class="admin-modal-acoes">
          <button type="button" class="btn btn-sec" :disabled="salvando" @click="fecharModal">
            Cancelar
          </button>
          <button type="submit" class="btn btn-pri" :disabled="salvando">
            {{ salvando ? "Salvando..." : "Criar estabelecimento" }}
          </button>
        </div>
      </form>
    </div>

    <!-- Modal de cadastro do primeiro funcionário -->
    <div
      v-if="modalFuncionario"
      class="admin-modal-overlay"
      @click.self="fecharModais"
    >
        <form class="admin-modal" @submit.prevent="salvarFuncionario">
        <h2>Novo funcionário</h2>
        <p class="admin-modal-sub">Adicione uma pessoa a um estabelecimento já cadastrado.</p>
 
        <label class="rotulo">
          Estabelecimento *
          <select v-model="formFunc.cnpj" class="campo" required>
            <option value="" disabled>Selecione...</option>
            <option v-for="e in estabelecimentos" :key="e.cnpj" :value="e.cnpj">
              {{ e.nome }} — {{ e.cnpj }}
            </option>
          </select>
        </label>
 
        <div class="grade">
          <label class="rotulo">
            Nome *
            <input v-model="formFunc.nome" class="campo" maxlength="120" required />
          </label>
          <label class="rotulo">
            E-mail *
            <input
              v-model="formFunc.email"
              class="campo"
              type="email"
              maxlength="191"
              autocomplete="off"
              required
            />
          </label>
          <label class="rotulo">
            Idade *
            <input
              v-model.number="formFunc.idade"
              class="campo"
              type="number"
              min="14"
              max="100"
              required
            />
          </label>
          <label class="rotulo">
            Telefone
            <input v-model="formFunc.telefone" class="campo" maxlength="30" />
          </label>
          <label class="rotulo">
            Perfil de acesso *
            <select v-model="formFunc.perfil" class="campo">
              <option value="profissional">Profissional (operação)</option>
              <option value="gestor">Gestor (administra a fábrica)</option>
            </select>
          </label>
          <label class="rotulo">
            Função
            <input
              v-model="formFunc.funcoes"
              class="campo"
              maxlength="80"
              :placeholder="formFunc.perfil === 'gestor' ? 'Administrador' : 'Profissional'"
            />
          </label>
        </div>
 
        <div class="linha-senha">
          <label class="rotulo flex-1">
            Senha inicial * (mínimo 8 caracteres)
            <input
              v-model="formFunc.senha"
              class="campo"
              :type="mostrarSenha ? 'text' : 'password'"
              minlength="8"
              maxlength="72"
              autocomplete="new-password"
              required
            />
          </label>
          <button type="button" class="btn btn-sec" @click="mostrarSenha = !mostrarSenha">
            {{ mostrarSenha ? "Ocultar" : "Mostrar" }}
          </button>
          <button type="button" class="btn btn-sec" @click="gerarSenha(formFunc)">
            Gerar senha
          </button>
        </div>
 
        <p v-if="erroForm" class="aviso aviso-erro">{{ erroForm }}</p>
 
        <div class="admin-modal-acoes">
          <button type="button" class="btn btn-sec" :disabled="salvando" @click="fecharModal">
            Cancelar
          </button>
          <button type="submit" class="btn btn-pri" :disabled="salvando">
            {{ salvando ? "Salvando..." : "Criar funcionário" }}
          </button>
        </div>
      </form>
    </div>

    <!-- Modal de detalhes -->
    <div
      v-if="modalDetalhes"
      class="admin-modal-overlay"
      @click.self="fecharModais"
    >
      <div class="admin-modal">
        <div class="admin-modal-header">
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

        <div class="admin-modal-acoes">
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

    <!-- ░░░ Modal: credenciais criadas ░░░ -->
    <div v-if="modal === 'sucesso' && credenciais" class="admin-overlay" @click.self="fecharModal">
      <div class="admin-modal admin-modal-peq">
        <h2>{{ credenciais.titulo }}</h2>
        <p class="admin-modal-sub">
          Anote ou copie as credenciais agora: a senha <strong>não será exibida novamente</strong>.
          Oriente a pessoa a trocar a senha no primeiro acesso.
        </p>
 
        <div class="credenciais">
          <div><span class="sub">Estabelecimento</span><br />{{ credenciais.estabelecimento }}</div>
          <div><span class="sub">E-mail</span><br />{{ credenciais.email }}</div>
          <div><span class="sub">Senha inicial</span><br /><code>{{ credenciais.senha }}</code></div>
        </div>
 
        <p v-if="copiado" class="aviso aviso-ok">Copiado para a área de transferência.</p>
 
        <div class="admin-modal-acoes">
          <button class="btn btn-sec" @click="copiarCredenciais">Copiar e-mail e senha</button>
          <button class="btn btn-pri" @click="fecharModal">Concluir</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import carregandoTela from '@/components/carregandoTela.vue';

export default {
  name: "AdminView",

  components: {
    SidebarNav,
    carregandoTela,
  },

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
      erroForm: "",
      estado: "",
      mensagem: "Aguardando...",
      modalEstabelecimento: false,
      modalFuncionario: false,
      modalDetalhes: false,
      modal: "",
      credenciais: null,
      copiado: false,
      mostrarSenha: false,
      estabelecimentoSelecionado: null,

      formEstab: {
        nome: "",
        cnpj: "",
        telefone: "",
        endereco: "",
        criarEtapasPadrao: false,
        gestor: {
          nome: "",
          email: "",
          idade: null,
          telefone: "",
          senha: "",
        },
      },

      formFunc: {
        cnpj: "",
        nome: "",
        email: "",
        idade: null,
        telefone: "",
        perfil: "profissional",
        funcoes: "",
        senha: "",
      },
    };
  },

  computed: {
    estabelecimentosFiltrados() {
      return this.estabelecimentos.filter((e) => {
        const termo = this.pesquisa.toLowerCase().trim();
        const correspondePesquisa =
          !termo ||
          e.nome?.toLowerCase().includes(termo) ||
          e.cnpj?.toLowerCase().includes(termo);

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

        return correspondePesquisa && correspondeEficiencia;
      });
    },

    totalFuncionarios() {
      return this.estabelecimentos.reduce(
        (total, e) => total + (Number(e.quantidade_funcionarios) || 0),
        0
      );
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

    if (!authStore.pegar_token) {
      this.erroLista = "Sua sessão expirou. Entre novamente para continuar.";
      return;
    }

    this.testarPing();
    this.carregarEstabelecimentos();
  },

  methods: {
    headersAuth() {
      const token = useAuthStore().pegar_token;
      if (!token) return {};
      return {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      };
    },

    async carregar() {
      await this.carregarEstabelecimentos();
    },

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
          const eficiencia = e.eficiencia_atual ?? e.eficiencia ?? null;
          return {
            ...e,
            quantidade_funcionarios: Number(
              e.quantidade_funcionarios ??
              e.total_funcionarios ??
              e.funcionarios?.length ??
              0
            ),
            funcionarios_ativos: Number(
              e.funcionarios_ativos ?? e.funcionarios?.filter(
                (f) => f.status !== "inativo"
              ).length ?? 0
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
      this.erroForm = "";
      this.formEstab = {
        nome: "",
        cnpj: "",
        telefone: "",
        endereco: "",
        criarEtapasPadrao: false,
        gestor: {
          nome: "",
          email: "",
          idade: null,
          telefone: "",
          senha: "",
        },
      };
      this.modalEstabelecimento = true;
    },

    async salvarEstabelecimento() {
      this.salvando = true;
      this.erroForm = "";

      try {
        const respostaEstabelecimento = await api.post(
          "/admin/estabelecimentos",
          {
            nome: this.formEstab.nome,
            cnpj: this.formEstab.cnpj,
            telefone: this.formEstab.telefone,
            endereco: this.formEstab.endereco,
          },
          { headers: this.headersAuth() }
        );

        const estabelecimento =
          respostaEstabelecimento.data.estabelecimento ||
          respostaEstabelecimento.data;

        if (!estabelecimento?.cnpj) {
          throw new Error("O servidor não retornou o CNPJ cadastrado.");
        }

        // O backend possui uma rota separada para cadastrar o primeiro usuário.
        this.formFunc = {
          cnpj: estabelecimento.cnpj,
          nome: this.formEstab.gestor.nome,
          email: this.formEstab.gestor.email,
          idade: this.formEstab.gestor.idade,
          telefone: this.formEstab.gestor.telefone,
          perfil: "gestor",
          funcoes: "Administrador",
          senha: this.formEstab.gestor.senha,
        };

        this.estabelecimentoSelecionado = estabelecimento;
        this.modalEstabelecimento = false;
        this.modalFuncionario = true;

        await this.salvarFuncionario(true);
      } catch (error) {
        console.error("Erro ao cadastrar estabelecimento:", error);
        this.erroForm =
          error.response?.data?.message ||
          error.message ||
          "Não foi possível cadastrar o estabelecimento.";
      } finally {
        this.salvando = false;
      }
    },

    async salvarFuncionario(primeiroUsuario = false) {
      primeiroUsuario = primeiroUsuario === true;
      this.salvando = true;
      this.erroForm = "";

      try {
        await api.post(
          "/admin/funcionarios",
          {
            cnpj: this.formFunc.cnpj,
            nome: this.formFunc.nome,
            email: this.formFunc.email,
            idade: Number(this.formFunc.idade),
            telefone: this.formFunc.telefone,
            funcao: this.formFunc.funcoes || (
              this.formFunc.perfil === "gestor" ? "Administrador" : "Profissional"
            ),
            funcoes: this.formFunc.funcoes || (
              this.formFunc.perfil === "gestor" ? "Administrador" : "Profissional"
            ),
            perfil: this.formFunc.perfil,
            senha: this.formFunc.senha,
          },
          { headers: this.headersAuth() }
        );

        const estabelecimento = this.estabelecimentos.find(
          (e) => e.cnpj === this.formFunc.cnpj
        ) || this.estabelecimentoSelecionado;

        this.modalFuncionario = false;
        this.credenciais = {
          titulo: primeiroUsuario ? "Estabelecimento criado!" : "Funcionário cadastrado!",
          estabelecimento: estabelecimento?.nome || this.formFunc.cnpj,
          email: this.formFunc.email,
          senha: this.formFunc.senha,
        };
        this.modal = "sucesso";
        this.copiado = false;
        await this.carregarEstabelecimentos();
      } catch (error) {
        console.error("Erro ao cadastrar funcionário:", error);
        this.erroForm =
          error.response?.data?.message ||
          (primeiroUsuario
            ? "O estabelecimento foi criado, mas não foi possível cadastrar o administrador."
            : "Não foi possível cadastrar o funcionário.");
      } finally {
        this.salvando = false;
      }
    },

    abrirCadastroFuncionario(estabelecimento) {
      this.estabelecimentoSelecionado = estabelecimento;
      this.erroForm = "";
      this.formFunc = {
        cnpj: estabelecimento.cnpj,
        nome: "",
        email: "",
        idade: null,
        telefone: "",
        perfil: "profissional",
        funcoes: "",
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
      this.erroForm = "";
      this.estabelecimentoSelecionado = null;
    },

    fecharModal() {
      this.modal = "";
      this.credenciais = null;
      this.copiado = false;
      this.fecharModais();
    },

    mascararCnpj(valor) {
      const numeros = String(valor || "").replace(/\D/g, "").slice(0, 14);
      return numeros
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    },

    gerarSenha(formulario) {
      const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
      let senha = "";
      for (let i = 0; i < 14; i++) {
        senha += caracteres.charAt(
          Math.floor(Math.random() * caracteres.length)
        );
      }
      formulario.senha = senha;
    },

    async copiarCredenciais() {
      if (!this.credenciais) return;
      const texto =
        `Estabelecimento: ${this.credenciais.estabelecimento}\n` +
        `E-mail: ${this.credenciais.email}\n` +
        `Senha inicial: ${this.credenciais.senha}`;

      try {
        await navigator.clipboard.writeText(texto);
        this.copiado = true;
      } catch (error) {
        console.error("Não foi possível copiar as credenciais:", error);
        this.erroForm = "Não foi possível copiar. Copie os dados manualmente.";
      }
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
          ? `Erro ${status}: ${error.response?.data?.message || "sem mensagem"}`
          : "Sem resposta do servidor";
      } finally {
        this.carregando = false;
      }
    },
  },
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .content-wrapper {
    padding-left: 0;
  }
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
  grid-template-columns: repeat(3, 1fr);
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

.admin-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}

/* Modais */

.admin-modal-overlay {
  position: fixed;
  top: 0;
  left: 200px;
  right: 0;
  bottom: 0;
  z-index: 9999;

  background: rgba(0, 0, 0, 0.55);

  display: flex;
  justify-content: center;
  align-items: center;

  padding: 20px;
  overflow-y: auto;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .admin-modal-overlay {
    left: 0;
  }
}

.admin-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  background: #fff;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  color: #26372e;
  margin: auto;
  flex-shrink: 0;
}

/* Títulos centralizados */

.admin-modal h2 {
  width: 100%;
  margin: 0;
  color: #145a32;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
}

.admin-modal h3 {
  width: 100%;
  margin: 12px 0 2px;
  padding-bottom: 9px;
  border-bottom: 1px solid #e8eee9;
  color: #145a32;
  font-size: 15px;
  text-align: left;
}

.admin-modal-sub {
  margin: 0 0 10px;
  color: #888;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

/* Campos e labels alinhados à esquerda */

.admin-modal .rotulo {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
  margin: 0;
  color: #444;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.admin-modal .campo,
.admin-modal input,
.admin-modal select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #dce5df;
  border-radius: 8px;
  background: #fff;
  color: #333;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.admin-modal .campo:focus,
.admin-modal input:focus,
.admin-modal select:focus {
  border-color: #145a32;
  box-shadow: 0 0 0 3px rgba(20, 90, 50, 0.08);
}

/* Organização dos campos */

.admin-modal .grade {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}

.admin-modal .linha-senha {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
}

.admin-modal .flex-1 {
  flex: 1;
  min-width: 0;
}

/* Cabeçalho do modal de detalhes */

.admin-modal-header {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 35px;
  text-align: center;
}

.admin-modal-header h2 {
  color: #145a32;
  font-size: 21px;
  margin: 0;
  text-align: center;
}

.admin-modal-header p {
  color: #888;
  font-size: 12px;
  margin: 7px 0 0;
}

.fechar {
  position: absolute;
  right: 0;
  top: -8px;
  border: none;
  background: transparent;
  font-size: 28px;
  color: #777;
}

/* Detalhes */

.detalhes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.detalhes-grid div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.detalhes-grid span {
  color: #888;
  font-size: 12px;
}

.detalhes-grid strong {
  color: #173d2c;
  font-size: 14px;
}

/* Credenciais */

.admin-modal-peq {
  max-width: 460px;
}

.credenciais {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f5f8f5;
  border: 1px solid #e5ece6;
  border-radius: 10px;
  overflow-wrap: anywhere;
}

.credenciais .sub {
  color: #888;
  font-size: 12px;
}

/* Botões */

.admin-modal-acoes {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #edf0ed;
}

.btn-cancelar {
  padding: 11px 17px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 9px;
  color: #666;
  font-weight: 600;
}

.admin-modal-acoes .btn {
  padding: 11px 17px;
  border-radius: 9px;
  font-weight: 600;
}

/* Responsividade */

@media (max-width: 650px) {
  .admin-modal {
    padding: 22px 18px;
    max-height: 92vh;
  }

  .admin-modal .grade {
    grid-template-columns: 1fr;
  }

  .admin-modal .linha-senha {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-modal .linha-senha button {
    width: 100%;
  }

  .admin-modal-acoes {
    flex-direction: column-reverse;
  }

  .admin-modal-acoes button {
    width: 100%;
  }

  .detalhes-grid {
    grid-template-columns: 1fr;
  }
}

</style>
