import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TEXTO = {
  titulo: 'Política de Privacidade',
  atualizadoEm: '27 de outubro de 2026',
  contato: 'viniyto10@gmail.com',
  conteudo: [
    { sub: 'Quem somos', texto: 'O Minhas Economias é uma ferramenta de organização financeira pessoal.' },
    { sub: 'Dados coletados', texto: 'Coletamos nome, e-mail e foto da sua conta Google, além dos dados financeiros que você cadastra manualmente (lançamentos, categorias, responsáveis e formas de pagamento).' },
    { sub: 'Finalidade', texto: 'Usamos esses dados exclusivamente para que você possa organizar suas finanças pessoais.' },
    { sub: 'Segurança e Compartilhamento', texto: 'Seus dados são armazenados de forma segura no Supabase. Não vendemos, compartilhamos com terceiros nem usamos seus dados para publicidade. Cada conta tem acesso exclusivo aos seus próprios dados.' },
    { sub: 'Seus direitos', texto: 'Você pode acessar, corrigir ou exportar seus dados a qualquer momento. Você pode excluir sua conta diretamente na tela de Configurações do aplicativo, o que removerá todos os seus dados permanentemente.' },
    { sub: 'Retenção', texto: 'Os dados são mantidos enquanto você utilizar o aplicativo. Se você excluir sua conta, os dados serão removidos do nosso banco de dados.' }
  ]
};

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-6 text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="text-3xl font-bold">{TEXTO.titulo}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Última atualização: {TEXTO.atualizadoEm}</p>
        <div className="space-y-4">
          {TEXTO.conteudo.map((item, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold">{item.sub}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.texto}</p>
            </div>
          ))}
          <p className="text-sm">Para dúvidas, entre em contato: <a href={`mailto:${TEXTO.contato}`} className="text-[var(--primary)] underline">{TEXTO.contato}</a></p>
        </div>
      </div>
    </div>
  );
}
