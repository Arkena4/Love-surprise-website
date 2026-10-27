import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'pay'; slug: string }
  | { name: 'view'; slug: string }
  | { name: 'share'; slug: string }
  | { name: 'order'; slug: string }
  | { name: 'admin' }
  | { name: 'admin-login' }
  | { name: 'notfound' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  if (!h || h === 'home') return { name: 'home' };
  if (h === 'create') return { name: 'create' };
  const parts = h.split('/');
  if (parts[0] === 'pay' && parts[1]) return { name: 'pay', slug: parts[1] };
  if (parts[0] === 'view' && parts[1]) return { name: 'view', slug: parts[1] };
  if (parts[0] === 'share' && parts[1]) return { name: 'share', slug: parts[1] };
  if (parts[0] === 'order' && parts[1]) return { name: 'order', slug: parts[1] };
  if (h === 'admin') return { name: 'admin' };
  if (h === 'admin-login') return { name: 'admin-login' };
  return { name: 'notfound' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'create': return '#/create';
    case 'pay': return `#/pay/${route.slug}`;
    case 'view': return `#/view/${route.slug}`;
    case 'share': return `#/share/${route.slug}`;
    case 'order': return `#/order/${route.slug}`;
    case 'admin': return '#/admin';
    case 'admin-login': return '#/admin-login';
    default: return '#/';
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = routeToHash(r);
  }, []);

  return { route, navigate };
}
