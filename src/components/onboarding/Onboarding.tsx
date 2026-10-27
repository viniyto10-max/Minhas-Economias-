import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useCadastros } from '../../hooks/useCadastros';
import { ChevronLeft, ChevronRight, Wallet, Check, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { responsaveis, atualizarProfile } = useCadastros();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await atualizarProfile(user.id, new Date().toISOString());
      onComplete();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-app)] flex flex-col items-center justify-center p-6 text-[var(--text-primary)]">
      <div className="w-full max-w-sm space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Quem usa o app?</h2>
            <p className="text-sm text-[var(--text-secondary)]">Gerencie quem está lançando despesas.</p>
            <div className="space-y-2">
              {responsaveis.map(r => (
                <div key={r.id} className="p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                  {r.nome}
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold">Próximo</button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Seus cartões e contas</h2>
            <div className="flex flex-wrap gap-2">
              {['Nubank', 'Inter', 'Itaú', 'Bradesco', 'Santander', 'Caixa', 'Banco do Brasil', 'C6 Bank', 'Mercado Pago', 'PicPay'].map(banco => (
                <button key={banco} className="px-3 py-1.5 bg-[var(--bg-input)] rounded-full text-xs">{banco}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 bg-[var(--bg-input)] rounded-xl font-bold">Voltar</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-bold">Próximo</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold">Tudo pronto!</h2>
            <p className="text-sm text-[var(--text-secondary)]">Agora você pode começar a registrar suas finanças.</p>
            <button onClick={finish} disabled={loading} className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold">{loading ? 'Salvando...' : 'Começar'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
