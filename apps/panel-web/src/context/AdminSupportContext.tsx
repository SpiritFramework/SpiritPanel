import { createContext, useContext, type ReactNode } from 'react';

export interface AdminSupportOwner {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}

interface AdminSupportContextValue {
  owner: AdminSupportOwner;
  serverName: string;
  backTo: string;
}

const AdminSupportContext = createContext<AdminSupportContextValue | null>(null);

export function AdminSupportProvider({
  owner,
  serverName,
  backTo,
  children,
}: {
  owner: AdminSupportOwner;
  serverName: string;
  backTo: string;
  children: ReactNode;
}) {
  return (
    <AdminSupportContext.Provider value={{ owner, serverName, backTo }}>
      {children}
    </AdminSupportContext.Provider>
  );
}

export function useAdminSupport() {
  return useContext(AdminSupportContext);
}
