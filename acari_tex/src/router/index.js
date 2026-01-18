import { createRouter, createWebHistory } from 'vue-router'
//import HomeView from '../views/Login.vue'
import HomeView from '../views/HomeView.vue'
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  },
  {
    path: '/login',
    name: 'login',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/Login.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/DashboardView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/adicionar-peca',
    name: 'Adicionar Peca',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AdicionarPecaView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/adicionar-profissional',
    name: 'Adicionar funcionario',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AdicionarFuncionario.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/Producao',
    name: 'Estoque de tecidos',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/ProducaoView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/slides-producao',
    name: 'Slides Produção',
    component: () => import(/* webpackChunkName: "about" */ '../views/SlidesProducaoView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/etapas',
    name: 'etapas',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/EtapasEmpresaView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/solicitar/alterar-senha',
    name: 'alterarSenhaUser',
    props: true,
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AlterarSenha.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/alterar-senha',
    name: 'alterarSenha',
    props: true,
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AlterarSenhaView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/MinhaEquipe',
    name: 'Minha equipe',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/EquipeView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/relatorios',
    name: 'Relatórios',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/RelatoriosView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/pecas/:id',
    name: 'Estatísticas',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/EstatisticaPorPecaView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/nao-autorizado',
    name: 'NaoAutorizado',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/NaoAutorizado.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/minha-equipe',
    name: 'minhaEquipe',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/MinhaEquipeview.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
  {
    path: '/financeiro',
    name: 'financeiro',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/FinanceiroFabricaView.vue')

  },
    {
    path: '/eficiencia',
    name: 'eficiencia',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/EficienciaTurmaView.vue')

  },
  {
    path: '/tempo-producao/:emailFuncionario',
    name: 'tempoProducao',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/TempodeProducao.vue'),
    meta: {
      title: 'Linha Tex'
    }
  },
    {
    path: '/configuracoes',
    name: 'configuracoes-empresa',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/ConfiguracoesEmpresaView.vue'),
    meta: {
      title: 'Linha Tex'
    }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router