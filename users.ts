export type SystemRole = 'admin' | 'commercial' | 'licensee';

export type AppUser = {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: SystemRole;
  unitId: string;
  active: boolean;
  /** Meta mensal (R$) — comercial */
  monthlyGoal?: number;
  phone?: string;
  createdAt: string;
};

export type UserSession = {
  userId: string;
  username: string;
  name: string;
  role: SystemRole;
  unitId: string;
  monthlyGoal?: number;
};
