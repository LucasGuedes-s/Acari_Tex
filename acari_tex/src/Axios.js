import axios from 'axios';
import Swal from 'sweetalert2';
import router from './router';

const api = axios.create({
  //baseURL: 'https://acari-tex.onrender.com',
  baseURL: 'http://192.168.0.115:3333',
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response.status === 401) {
      console.error("Erro de autenticação:", error.response.data.message);
      router.push('/nao-autorizado');
    } else if (error.response.status === 403) {
      console.error("Acesso negado:", error.response.data.message);
    } else
    if (error.response.error) {
      console.error("Erro da API:", error.response.data.message);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.response.data.message || 'Ocorreu um erro inesperado.'
      });
    } else {
      console.error("Erro inesperado:", error.message);
      Swal.fire({
        icon: 'error',
        title: 'Erro de conexão',
        text: 'Verifique sua internet e tente novamente.'
      });
    }
    return Promise.reject(error);
  }
);

export default api;
