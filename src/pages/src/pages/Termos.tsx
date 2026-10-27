import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CONTATO = '[SEU_EMAIL_AQUI]';
const ATUALIZADO_EM = '27/10/2026';

const SECOES: { titulo: string; texto: string }[] = [
  {
    titulo: '1. O que é o Minhas Economias',
    texto:
      'O Minhas Economias é uma ferramenta de organização de finanças pessoais. Ele não é uma instituição financeira e não substitui orientação de um profissional.',
  },
  {
    titulo: '2. Sua conta e seus dados',
    texto:
      'O acesso é feito com a sua conta Google. Os lançamentos, categorias, responsáveis e formas de pagamento que você cadastra são seus e ficam disponíveis apenas para a sua conta. Você é responsável pela veracidade das informações que registra.',
  },
  {
    titulo: '3. Uso adequado',
    texto:
      'Use o aplicativo apenas para fins pessoais e lícitos. Não tente acessar dados de outras pessoas nem comprometer a segurança ou o funcionamento do serviço.',
  },
  {
    titulo: '4. Disponibilidade',
    texto:
      'O serviço é oferecido como está, sem garantia de funcionamento ininterrupto. Podem ocorrer manutenções, mudanças ou interrupções. Recomendamos exportar seus dados periodicamente em Configurações.',
  },
  {
    titulo: '5. Encerramento da conta',
    texto:
      'Você pode excluir a sua conta e todos os seus dados a qualquer momento, em Configurações. A exclusão é definitiva.',
  },
  {
    titulo: '6. Contato',
    texto: `Dúvidas sobre estes termos podem ser enviadas para ${CONTATO}.`,
  },
];

export default function Termos() {
  const navigate = useNavigate();

  const voltar = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <main className="min-h-[100dvh] bg-[var(--bg-app)] p-4 text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <button
          type="button"
          onClick={voltar}
          className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--primary)]"
        >
          <ArrowLeft size={18} /> Voltar
        </button>

        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow)]">
          <header className="space-y-1">
            <h1 className="text-xl font-bold">Termos de Uso</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Última atualização: {ATUALIZADO_EM}
            </p>
          </header>

          {SECOES.map((s) => (
            <div key={s.titulo} className="space-y-1">
              <h2 className="text-sm font-bold">{s.titulo}</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{s.texto}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
