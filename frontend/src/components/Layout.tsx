import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Repeat,
  UserPlus,
  Link2,
  QrCode,
  Users2,
  Calendar,
  Globe,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  isMenu?: boolean;
  submenu?: Array<{
    name: string;
    href: string;
    icon: any;
  }>;
}

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [paymentsMenuOpen, setPaymentsMenuOpen] = React.useState(false);

  // Helper function to check if a menu item is active
  const isMenuActive = (item: NavigationItem): boolean => {
    if (item.href) {
      return location.pathname === item.href;
    }
    if (item.submenu) {
      return item.submenu.some(subItem => location.pathname === subItem.href);
    }
    return false;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { 
      name: 'Payments', 
      icon: CreditCard, 
      isMenu: true,
      submenu: [
        { name: 'Subscriptions', href: '/subscriptions', icon: Repeat },
        { name: 'Split Payments', href: '/split-payments', icon: UserPlus },
        { name: 'Payment Links', href: '/payment-links', icon: Link2 },
        { name: 'QR Codes', href: '/qr-codes', icon: QrCode },
        { name: 'Bulk Payments', href: '/bulk-payments', icon: Users2 },
        { name: 'Scheduled', href: '/scheduled-payments', icon: Calendar }
      ]
    },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        className="fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl lg:hidden"
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">PulsePay</h1>
          <button onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.isMenu ? (
                  // Dropdown menu item for mobile
                  <div>
                    <button
                      onClick={() => setPaymentsMenuOpen(!paymentsMenuOpen)}
                      className={`group flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        isMenuActive(item) ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        {item.name}
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform duration-200 ${
                          paymentsMenuOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    
                    <AnimatePresence>
                      {paymentsMenuOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-6 mt-1 space-y-1">
                            {item.submenu?.map((subItem) => (
                              <NavLink
                                key={subItem.name}
                                to={subItem.href}
                                className={({ isActive }) =>
                                  `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                    isActive
                                      ? 'bg-primary-100 text-primary-700'
                                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                  }`
                                }
                                onClick={() => setSidebarOpen(false)}
                              >
                                <subItem.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                                {subItem.name}
                              </NavLink>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  // Regular menu item for mobile
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </NavLink>
                )}
              </div>
            ))}
          </div>
        </nav>
      </motion.aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">PulsePay</h1>
          </div>

          <nav className="mt-6 px-3 flex-1">
            <div className="space-y-1">
              {navigation.map((item) => (
                <div key={item.name}>
                  {item.isMenu ? (
                    // Dropdown menu item
                    <div>
                      <button
                        onClick={() => setPaymentsMenuOpen(!paymentsMenuOpen)}
                        className={`group flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                          isMenuActive(item) ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                          {item.name}
                        </div>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-200 ${
                            paymentsMenuOpen ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      
                      <AnimatePresence>
                        {paymentsMenuOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-6 mt-1 space-y-1">
                              {item.submenu?.map((subItem) => (
                                <NavLink
                                  key={subItem.name}
                                  to={subItem.href}
                                  className={({ isActive }) =>
                                    `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                      isActive
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`
                                  }
                                >
                                  <subItem.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                                  {subItem.name}
                                </NavLink>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    // Regular menu item
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                          isActive
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`
                      }
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1" />
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;