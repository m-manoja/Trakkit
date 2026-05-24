import { useAuth } from '../context/AuthContext';

export function usePlan() {
  const { user, refreshPlan } = useAuth();
  const plan = user?.plan ?? 'free';
  const isPremium = plan === 'premium';
  const isFree = !isPremium;

  return {
    plan,
    isPremium,
    isFree,
    refreshPlan,
  };
}
