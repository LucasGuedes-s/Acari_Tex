import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    usuario: null
  }),
  actions: {
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token); // Salva no localStorage
    },
    setUsuario(usuario) {
      this.usuario = usuario;
      localStorage.setItem('usuario', JSON.stringify(usuario)); // Salva no localStorage
    },
    carregarDadosPersistidos() {
      // Recupera os dados do localStorage (caso existam)
      const tokenPersistido = localStorage.getItem('token');
      const usuarioPersistido = localStorage.getItem('usuario');

      if (tokenPersistido) {
        this.token = tokenPersistido;
      }
      if (usuarioPersistido) {
        this.usuario = JSON.parse(usuarioPersistido);
      }
    },
    clearAuthData() {
      this.usuario = null;
      this.token = null;
      // Remover do localStorage e dos cookies
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    },
    logout() {
      this.clearAuthData();
    },
  },
  getters: {
    naoautenticado(state) {
      return state.token === null;
    },
    pegar_token(state) {
      return state.token;
    },
    pegar_usuario(state) {
      return state.usuario;
    }
  }
});
