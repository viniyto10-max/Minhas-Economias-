import { useNavigate } from 'react-router-dom';
import FormLancamento from '../components/novo/FormLancamento';

export default function NovoLancamento() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col space-y-4 pb-20 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] p-4">
        <FormLancamento onSave={async () => navigate('/')} onCancel={() => navigate('/')} />
      </div>
    </div>
  );
}
