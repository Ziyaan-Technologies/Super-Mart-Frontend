import { createRouter, createWebHistory } from 'vue-router';
import MainRoutes from './MainRoutes';
import AuthRoutes from './AuthRoutes';
import { useAuthStore } from '@/stores/auth';
import { getAbilities } from '@/utils/getAbilities';

const landingPages = [
    { path: '/dashboard/analytical', action: 'home_view', subject: 'Home' },
    { path: '/pos', action: 'pos_sell', subject: 'POS' },
    { path: '/products', action: 'products_view', subject: 'Product' },
    { path: '/stock', action: 'stock_view', subject: 'Stock' },
];

async function landingPath() {
  const ability = await getAbilities();
  return landingPages.find((page) => ability.can(page.action, page.subject))?.path || '/profile/update-details';
}

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/:pathMatch(.*)*',
            component: () => import('@/views/authentication/Error.vue')
        },
        MainRoutes,
        AuthRoutes
    ]
});

router.beforeEach(async (to, from, next) => {
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const publicPages = ['Login', 'Error', 'Unauthorized', 'Maintenance'];
  const authRequired = !publicPages.includes(to.name as string);
  const auth: any = useAuthStore();
  const isAuthenticated = !!auth.jwt;

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (authRequired && !isAuthenticated) {
      auth.returnUrl = to.fullPath;
      return next('/auth/login');
    }

    if (to.matched.some((record) => record.meta.requiresStore) && !auth.clientstoreId) {
      return next('/store');
    }

    if (to.matched.some((record) => record.meta.requiresPOSModule)) {
      if (auth.clientstore && auth.clientstore.is_pos_active === false) {
        return next('/dashboard/analytical');
      }
    }

    const actions: string[] = Array.isArray(to.meta.action)
      ? to.meta.action as string[]
      : typeof to.meta.action === 'string'
        ? [to.meta.action]
        : [];

    const subject = typeof to.meta.subject === 'string' ? to.meta.subject : undefined;

    if (actions.length > 0 && subject) {
      const ability = await getAbilities();
      const hasPermission = actions.some((action: string) => ability.can(action, subject));
      if (!hasPermission) {
        const landing = await landingPath();
        return next(landing === to.path ? '/auth/unauthorized' : landing);
      }
    }

    return next();
  }

  if (isAuthenticated && to.name === 'Login') {
    return next('/');
  }
  return next();
});
