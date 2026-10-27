import { useRouter } from '@/lib/router';
import { LandingPage } from '@/pages/LandingPage';
import { CreatePage } from '@/pages/CreatePage';
import { PayPage } from '@/pages/PayPage';
import { ViewPage } from '@/pages/ViewPage';
import { SharePage } from '@/pages/SharePage';
import { OrderStatusPage } from '@/pages/OrderStatusPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AdminPage } from '@/pages/AdminPage';

function App() {
  const { route, navigate } = useRouter();

  switch (route.name) {
    case 'home':
      return <LandingPage navigate={navigate} />;
    case 'create':
      return <CreatePage navigate={navigate} />;
    case 'pay':
      return <PayPage slug={route.slug} navigate={navigate} />;
    case 'view':
      return <ViewPage slug={route.slug} navigate={navigate} />;
    case 'share':
      return <SharePage slug={route.slug} navigate={navigate} />;
    case 'order':
      return <OrderStatusPage slug={route.slug} navigate={navigate} />;
    case 'admin-login':
      return <AdminLoginPage navigate={navigate} />;
    case 'admin':
      return <AdminPage navigate={navigate} />;
    default:
      return <LandingPage navigate={navigate} />;
  }
}

export default App;
