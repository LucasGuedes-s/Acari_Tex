import axios from 'axios';
import Swal from 'sweetalert2';
import router from './router';

/**
 * Lista de backends (ordem de prioridade)
 */
const BASE_URLS = [
  'https://acari-tex.onrender.com',
  //'http://localhost:3333'
];

let currentBaseURLIndex = 0;


const api = axios.create({
  baseURL: BASE_URLS[currentBaseURLIndex],
  timeout: 10000, // detecta servidor fora
});

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

api.interceptors.response.use(
  (response) => response,

  async (error) => {

    if (!error.response) {
      // tenta próximo backend
      if (currentBaseURLIndex < BASE_URLS.length - 1) {
        currentBaseURLIndex++;
        api.defaults.baseURL = BASE_URLS[currentBaseURLIndex];

        Toast.fire({
          icon: 'warning',
          title: 'Servidor alternativo ativado'
        });

        return api(error.config);
      }

      Toast.fire({
        icon: 'error',
        title: 'Não foi possível conectar ao servidor'
      });

      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const message = data?.message;

    if (status === 401) {
      router.push('/nao-autorizado');
      return Promise.reject(error);
    }

    if (status === 403) {
      Toast.fire({
        icon: 'warning',
        title: 'Acesso negado'
      });
      return Promise.reject(error);
    }

    Toast.fire({
      icon: 'error',
      title: message || 'Erro inesperado'
    });

    return Promise.reject(error);
  }
);

export default api;
